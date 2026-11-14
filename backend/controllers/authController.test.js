import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthController } from './authController.js';
import { hashSessionToken } from '../security/session.js';

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  set(name, value) {
    this.headers[name.toLowerCase()] = value;
    return this;
  },
  append(name, value) {
    const key = name.toLowerCase();
    this.headers[key] = [
      ...(Array.isArray(this.headers[key]) ? this.headers[key] : []),
      value,
    ];
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  end() {
    return this;
  },
});

const makeUser = (isAdmin = true) => ({
  _id: 'user-id',
  name: 'Test User',
  email: 'test@example.com',
  isAdmin,
  matchPassword: async (password) => password === 'correct-password',
});

test('login normalizes email, creates a hashed session, and returns only public user fields', async () => {
  let queriedEmail;
  let selectedPassword = false;
  let storedSession;
  let clearedAttempts;
  const token = 'opaque-session-token';
  const controller = createAuthController({
    UserModel: {
      findOne(query) {
        queriedEmail = query.email;
        return {
          select: async (fields) => {
            selectedPassword = fields === '+password';
            return makeUser();
          },
        };
      },
    },
    SessionModel: {
      create: async (session) => {
        storedSession = session;
      },
      updateOne: async () => ({ modifiedCount: 0 }),
    },
    LoginAttemptModel: {
      deleteOne: async (filter) => {
        clearedAttempts = filter;
      },
    },
    createToken: () => token,
    now: () => new Date('2026-11-14T12:00:00.000Z'),
    sessionMaxAgeMs: 60_000,
    isProduction: false,
  });
  const response = createResponse();

  await controller.login(
    {
      body: { email: '  TEST@Example.com ', password: 'correct-password' },
      headers: {},
      loginAttempt: { accountKey: 'hashed-account-key' },
    },
    response,
    assert.fail,
  );

  assert.equal(queriedEmail, 'test@example.com');
  assert.equal(selectedPassword, true);
  assert.deepEqual(storedSession, {
    tokenHash: hashSessionToken(token),
    userId: 'user-id',
    createdAt: new Date('2026-11-14T12:00:00.000Z'),
    expiresAt: new Date('2026-11-14T12:01:00.000Z'),
  });
  assert.notEqual(storedSession.tokenHash, token);
  assert.deepEqual(clearedAttempts, { key: 'hashed-account-key' });
  assert.deepEqual(response.body, {
    _id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    isAdmin: true,
  });
  assert.equal(Object.hasOwn(response.body, 'token'), false);
  assert.match(response.headers['set-cookie'][0], /HttpOnly/);
  assert.match(response.headers['set-cookie'][0], /SameSite=Lax/);
  assert.match(response.headers['set-cookie'][0], /Path=\//);
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('login returns the same unauthorized response for unknown users and wrong passwords', async () => {
  const responses = [];

  for (const user of [null, makeUser()]) {
    const controller = createAuthController({
      UserModel: {
        findOne: () => ({
          select: async () => user,
        }),
      },
      SessionModel: { create: assert.fail },
    });
    const response = createResponse();

    await controller.login(
      { body: { email: 'test@example.com', password: 'wrong-password' } },
      response,
      assert.fail,
    );
    responses.push({ statusCode: response.statusCode, body: response.body });
  }

  assert.deepEqual(responses[0], responses[1]);
  assert.equal(responses[0].statusCode, 401);
  assert.deepEqual(responses[0].body, {
    success: false,
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid credentials',
  });
});

test('login rejects invalid input before querying the user model', async () => {
  const controller = createAuthController({
    UserModel: { findOne: assert.fail },
  });
  const response = createResponse();

  await controller.login(
    { body: { email: 'not-an-email', password: 'password' } },
    response,
    assert.fail,
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, 'INVALID_LOGIN_INPUT');
});

test('login revokes a prior cookie session before issuing a new session', async () => {
  const operations = [];
  const controller = createAuthController({
    UserModel: {
      findOne: () => ({ select: async () => makeUser() }),
    },
    SessionModel: {
      updateOne: async (filter) => operations.push(['revoke', filter]),
      create: async (session) => operations.push(['create', session]),
    },
    LoginAttemptModel: { deleteOne: async () => {} },
    createToken: () => 'new-session-token',
    isProduction: false,
  });
  const response = createResponse();

  await controller.login(
    {
      body: { email: 'test@example.com', password: 'correct-password' },
      headers: { cookie: 'portfolio_session=old-session-token' },
    },
    response,
    assert.fail,
  );

  assert.equal(operations[0][0], 'revoke');
  assert.equal(
    operations[0][1].tokenHash,
    hashSessionToken('old-session-token'),
  );
  assert.equal(operations[1][0], 'create');
  assert.notEqual(
    operations[1][1].tokenHash,
    hashSessionToken('old-session-token'),
  );
});

test('CSRF token endpoint issues a cookie and a no-store response', () => {
  const controller = createAuthController({
    sessionMaxAgeMs: 60_000,
    isProduction: true,
  });
  const response = createResponse();

  controller.csrfToken({}, response);

  assert.equal(response.body.csrfToken.length, 43);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.match(response.headers['set-cookie'][0], /portfolio_csrf=/);
  assert.match(response.headers['set-cookie'][0], /Secure/);
  assert.match(response.headers['set-cookie'][0], /SameSite=Lax/);
  assert.doesNotMatch(response.headers['set-cookie'][0], /HttpOnly/);
  assert.match(response.headers['set-cookie'][0], /Path=\/api/);
});

test('logout revokes the opaque session and clears session and CSRF cookies', async () => {
  let revokedFilter;
  const controller = createAuthController({
    SessionModel: {
      updateOne: async (filter) => {
        revokedFilter = filter;
      },
    },
    isProduction: true,
  });
  const response = createResponse();

  await controller.logout(
    { headers: { cookie: '__Host-portfolio_session=old-session-token' } },
    response,
    assert.fail,
  );

  assert.equal(
    revokedFilter.tokenHash,
    hashSessionToken('old-session-token'),
  );
  assert.equal(revokedFilter.revokedAt, null);
  assert.equal(response.statusCode, 204);
  assert.match(response.headers['set-cookie'][0], /__Host-portfolio_session=/);
  assert.match(response.headers['set-cookie'][0], /Secure/);
  assert.match(response.headers['set-cookie'][0], /Max-Age=0/);
  assert.match(response.headers['set-cookie'][1], /portfolio_csrf=/);
  assert.match(response.headers['set-cookie'][1], /Max-Age=0/);
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('logout succeeds and clears cookies when no session cookie exists', async () => {
  const controller = createAuthController({
    SessionModel: { updateOne: assert.fail },
  });
  const response = createResponse();

  await controller.logout({ headers: {} }, response, assert.fail);

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers['set-cookie'].length, 2);
});

test('public registration stays disabled', () => {
  const controller = createAuthController();
  const response = createResponse();

  controller.register({}, response);

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, {
    success: false,
    message: 'Public registration is disabled',
  });
});

test('forwards database errors without converting them into authentication failures', async () => {
  const databaseError = new Error('database unavailable');
  const controller = createAuthController({
    UserModel: {
      findOne: () => ({
        select: async () => {
          throw databaseError;
        },
      }),
    },
  });
  let forwardedError;

  await controller.login(
    { body: { email: 'user@example.com', password: 'password' } },
    createResponse(),
    (error) => {
      forwardedError = error;
    },
  );

  assert.equal(forwardedError, databaseError);
});
