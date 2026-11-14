import assert from 'node:assert/strict';
import test from 'node:test';
import { adminOnly, createProtect } from './auth.js';
import { hashSessionToken } from '../security/session.js';

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const createRequest = (token = 'session-token') => ({
  headers: token ? { cookie: `portfolio_session=${token}` } : {},
});

const createUserModel = (user = { _id: 'user-id', isAdmin: true }) => ({
  findById: () => ({ select: async () => user }),
});

const createSessionModel = (session) => ({
  findOne: async (filter) => {
    assert.equal(filter.tokenHash, hashSessionToken('session-token'));
    return session;
  },
  updateOne: async () => ({ modifiedCount: 1 }),
});

test('requires a valid opaque session cookie', async () => {
  const middleware = createProtect({ SessionModel: createSessionModel(null) });
  const response = createResponse();
  let continued = false;

  await middleware(createRequest(), response, () => {
    continued = true;
  });

  assert.equal(response.statusCode, 401);
  assert.equal(continued, false);
});

test('does not accept the retired Bearer JWT contract', async () => {
  const middleware = createProtect({
    SessionModel: { findOne: assert.fail },
  });
  const response = createResponse();

  await middleware(
    { headers: { authorization: 'Bearer legacy-token' } },
    response,
    assert.fail,
  );

  assert.equal(response.statusCode, 401);
});

test('rejects a session whose expiry has passed', async () => {
  const middleware = createProtect({
    SessionModel: createSessionModel({
      userId: 'user-id',
      expiresAt: new Date('2026-11-14T11:59:59.999Z'),
      revokedAt: null,
    }),
    now: () => new Date('2026-11-14T12:00:00.000Z'),
  });
  const response = createResponse();
  let continued = false;

  await middleware(createRequest(), response, () => {
    continued = true;
  });

  assert.equal(response.statusCode, 401);
  assert.equal(continued, false);
});

test('rejects a revoked session even if its expiry is still in the future', async () => {
  const middleware = createProtect({
    SessionModel: createSessionModel({
      userId: 'user-id',
      expiresAt: new Date('2026-11-15T12:00:00.000Z'),
      revokedAt: new Date('2026-11-14T11:00:00.000Z'),
    }),
    now: () => new Date('2026-11-14T12:00:00.000Z'),
  });
  const response = createResponse();

  await middleware(createRequest(), response, assert.fail);

  assert.equal(response.statusCode, 401);
});

test('loads the current user from the database for an active session', async () => {
  const session = {
    _id: 'session-id',
    userId: 'user-id',
    expiresAt: new Date('2026-11-15T12:00:00.000Z'),
    revokedAt: null,
  };
  const middleware = createProtect({
    SessionModel: createSessionModel(session),
    UserModel: createUserModel(),
    now: () => new Date('2026-11-14T12:00:00.000Z'),
  });
  const req = createRequest();
  let continued = false;

  await middleware(req, createResponse(), () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.equal(req.session, session);
  assert.equal(req.user._id, 'user-id');
});

test('revokes an active session when its user no longer exists', async () => {
  let revoked = false;
  const middleware = createProtect({
    SessionModel: {
      ...createSessionModel({
        _id: 'session-id',
        userId: 'deleted-user',
        expiresAt: new Date('2026-11-15T12:00:00.000Z'),
        revokedAt: null,
      }),
      updateOne: async (filter) => {
        revoked = filter._id === 'session-id';
      },
    },
    UserModel: createUserModel(null),
    now: () => new Date('2026-11-14T12:00:00.000Z'),
  });
  const response = createResponse();

  await middleware(createRequest(), response, assert.fail);

  assert.equal(response.statusCode, 401);
  assert.equal(revoked, true);
});

test('forwards database failures rather than reporting them as invalid sessions', async () => {
  const databaseError = new Error('database unavailable');
  const middleware = createProtect({
    SessionModel: {
      findOne: async () => {
        throw databaseError;
      },
    },
  });
  let forwardedError;

  await middleware(createRequest(), createResponse(), (error) => {
    forwardedError = error;
  });

  assert.equal(forwardedError, databaseError);
});

test('blocks authenticated users without admin access', () => {
  const response = createResponse();
  let continued = false;

  adminOnly({ user: { isAdmin: false } }, response, () => {
    continued = true;
  });

  assert.equal(response.statusCode, 403);
  assert.equal(continued, false);
});

test('allows authenticated administrators', () => {
  let continued = false;

  adminOnly({ user: { isAdmin: true } }, createResponse(), () => {
    continued = true;
  });

  assert.equal(continued, true);
});
