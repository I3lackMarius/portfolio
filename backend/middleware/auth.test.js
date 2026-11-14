import assert from 'node:assert/strict';
import test from 'node:test';
import { adminOnly } from './auth.js';

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
