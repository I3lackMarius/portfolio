import assert from 'node:assert/strict';
import test from 'node:test';
import { createVercelHandler } from './vercelHandler.js';

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

test('connects to MongoDB before dispatching API requests to Express', async () => {
  const calls = [];
  const handler = createVercelHandler({
    connectDB: async () => calls.push('database'),
    app: () => calls.push('express'),
  });

  await handler({ method: 'GET' }, createResponse());

  assert.deepEqual(calls, ['database', 'express']);
});

test('handles CORS preflight without opening a database connection', async () => {
  const calls = [];
  const handler = createVercelHandler({
    connectDB: async () => calls.push('database'),
    app: () => calls.push('express'),
  });

  await handler({ method: 'OPTIONS' }, createResponse());

  assert.deepEqual(calls, ['express']);
});

test('returns an explicit unavailable response if MongoDB cannot connect', async () => {
  const response = createResponse();
  let expressCalled = false;
  const handler = createVercelHandler({
    connectDB: async () => {
      throw new Error('database connection failed');
    },
    app: () => {
      expressCalled = true;
    },
  });

  await handler({ method: 'GET' }, response);

  assert.equal(expressCalled, false);
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    success: false,
    error: 'API temporarily unavailable',
  });
});
