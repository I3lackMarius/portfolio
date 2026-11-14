import assert from 'node:assert/strict';
import test from 'node:test';
import LoginAttempt from '../models/LoginAttempt.js';
import Session from '../models/Session.js';
import { createLoginRateLimit } from './loginRateLimit.js';

class SharedAttemptStore {
  records = new Map();

  findOneAndUpdate({ key }, update, options) {
    let record = this.records.get(key);
    if (!record && options.upsert) {
      record = { key, ...update.$setOnInsert, attempts: 0 };
      this.records.set(key, record);
    }

    record.attempts += update.$inc.attempts;
    return Promise.resolve({ ...record });
  }
}

const createResponse = () => ({
  statusCode: 200,
  headers: {},
  body: undefined,
  set(name, value) {
    this.headers[name.toLowerCase()] = value;
    return this;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const invoke = async (middleware, { email, ip = '192.0.2.10' } = {}) => {
  const req = { body: { email }, ip };
  const res = createResponse();
  let continued = false;

  await middleware(req, res, (error) => {
    if (error) {
      throw error;
    }
    continued = true;
  });

  return { req, res, continued };
};

const secret = 'test-only-rate-limit-secret-with-sufficient-length';

test('allows attempts under the account threshold and rejects the next attempt temporarily', async () => {
  const store = new SharedAttemptStore();
  const middleware = createLoginRateLimit({
    LoginAttemptModel: store,
    secret,
    now: () => 1_000_000,
    windowMs: 60_000,
    accountLimit: 2,
    networkLimit: 20,
  });

  assert.equal((await invoke(middleware, { email: 'user@example.com' })).continued, true);
  assert.equal((await invoke(middleware, { email: 'user@example.com' })).continued, true);
  const blocked = await invoke(middleware, { email: 'user@example.com' });

  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.res.body.code, 'LOGIN_RATE_LIMITED');
  assert.equal(blocked.res.headers['retry-after'], '20');
});

test('shares atomic limits across limiter instances and does not store raw account or IP values', async () => {
  const store = new SharedAttemptStore();
  const options = {
    LoginAttemptModel: store,
    secret,
    now: () => 1_000_000,
    windowMs: 60_000,
    accountLimit: 3,
    networkLimit: 20,
  };
  const firstInstance = createLoginRateLimit(options);
  const secondInstance = createLoginRateLimit(options);
  const results = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      invoke(index % 2 ? firstInstance : secondInstance, {
        email: 'shared@example.com',
        ip: '198.51.100.27',
      }),
    ),
  );

  assert.equal(results.filter((result) => result.continued).length, 3);
  assert.equal(results.filter((result) => result.res.statusCode === 429).length, 3);
  assert.equal(
    [...store.records.keys()].some((key) =>
      key.includes('shared@example.com') || key.includes('198.51.100.27'),
    ),
    false,
  );
});

test('starts a new window after expiration', async () => {
  const store = new SharedAttemptStore();
  let time = 1_000_000;
  const middleware = createLoginRateLimit({
    LoginAttemptModel: store,
    secret,
    now: () => time,
    windowMs: 60_000,
    accountLimit: 1,
    networkLimit: 20,
  });

  assert.equal((await invoke(middleware, { email: 'user@example.com' })).continued, true);
  assert.equal((await invoke(middleware, { email: 'user@example.com' })).res.statusCode, 429);
  time += 60_000;
  assert.equal((await invoke(middleware, { email: 'user@example.com' })).continued, true);
});

test('groups clients by network prefix rather than trusting a single address', async () => {
  const store = new SharedAttemptStore();
  const middleware = createLoginRateLimit({
    LoginAttemptModel: store,
    secret,
    now: () => 1_000_000,
    windowMs: 60_000,
    accountLimit: 20,
    networkLimit: 1,
  });

  assert.equal(
    (await invoke(middleware, {
      email: 'first@example.com',
      ip: '198.51.100.27',
    })).continued,
    true,
  );
  assert.equal(
    (await invoke(middleware, {
      email: 'second@example.com',
      ip: '198.51.100.89',
    })).res.statusCode,
    429,
  );
});

test('limits malformed-login floods by network without creating an account bucket', async () => {
  const store = new SharedAttemptStore();
  const middleware = createLoginRateLimit({
    LoginAttemptModel: store,
    secret,
    now: () => 1_000_000,
    windowMs: 60_000,
    accountLimit: 1,
    networkLimit: 1,
  });

  assert.equal((await invoke(middleware, { email: undefined })).continued, true);
  const blocked = await invoke(middleware, { email: undefined });

  assert.equal(blocked.res.statusCode, 429);
  assert.equal(store.records.size, 1);
});

test('session and login-attempt models define TTL indexes for expiration cleanup', () => {
  const sessionIndexes = Session.schema.indexes();
  const attemptIndexes = LoginAttempt.schema.indexes();

  assert.ok(
    sessionIndexes.some(
      ([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0,
    ),
  );
  assert.ok(
    attemptIndexes.some(
      ([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0,
    ),
  );
});
