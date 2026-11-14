import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthController } from './authController.js';

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

test('login normalizes email and returns a token with public user fields', async () => {
  let queriedEmail;
  let selectedPassword = false;
  const user = {
    _id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    isAdmin: true,
    matchPassword: async (password) => password === 'correct-password',
  };
  const controller = createAuthController({
    UserModel: {
      findOne(query) {
        queriedEmail = query.email;
        return {
          select: async (fields) => {
            selectedPassword = fields === '+password';
            return user;
          },
        };
      },
    },
    signToken: (id) => `token-for-${id}`,
  });
  const response = createResponse();

  await controller.login(
    { body: { email: '  TEST@Example.com ', password: 'correct-password' } },
    response,
    assert.fail,
  );

  assert.equal(queriedEmail, 'test@example.com');
  assert.equal(selectedPassword, true);
  assert.deepEqual(response.body, {
    _id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    isAdmin: true,
    token: 'token-for-user-id',
  });
});

test('login returns the same unauthorized response for unknown users and bad passwords', async () => {
  const controller = createAuthController({
    UserModel: {
      findOne: () => ({ select: async () => null }),
    },
    signToken: assert.fail,
  });
  const response = createResponse();

  await controller.login(
    { body: { email: 'missing@example.com', password: 'wrong-password' } },
    response,
    assert.fail,
  );

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, {
    message: 'Invalid credentials',
    code: 'INVALID_CREDENTIALS',
  });
});

test('login rejects missing credentials', async () => {
  const controller = createAuthController({
    UserModel: { findOne: assert.fail },
  });
  const response = createResponse();

  await controller.login({ body: { email: 'user@example.com' } }, response, assert.fail);

  assert.equal(response.statusCode, 400);
});

test('public registration is disabled', () => {
  const controller = createAuthController();
  const response = createResponse();

  controller.register({}, response);

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { message: 'Public registration is disabled' });
});

test('forwards database errors to the Express error handler', async () => {
  const databaseError = new Error('database unavailable');
  const controller = createAuthController({
    UserModel: {
      findOne: () => ({ select: async () => { throw databaseError; } }),
    },
  });
  let forwardedError;

  await controller.login(
    { body: { email: 'user@example.com', password: 'password' } },
    createResponse(),
    (error) => { forwardedError = error; },
  );

  assert.equal(forwardedError, databaseError);
});
