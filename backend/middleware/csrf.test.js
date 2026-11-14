import assert from 'node:assert/strict';
import test from 'node:test';
import { createCsrfProtection } from './csrf.js';

const validToken = 'a'.repeat(43);

const createRequest = ({
  method = 'POST',
  origin = 'http://localhost:5173',
  cookie = `portfolio_csrf=${validToken}`,
  token = validToken,
} = {}) => ({
  method,
  headers: {
    ...(origin ? { origin } : {}),
    ...(cookie ? { cookie } : {}),
    ...(token ? { 'x-csrf-token': token } : {}),
  },
  get(name) {
    return this.headers[name.toLowerCase()];
  },
});

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

const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://www.negrumarius.com',
]);

test('allows an unsafe request with an allowlisted origin and matching CSRF cookie/header', () => {
  const middleware = createCsrfProtection({ allowedOrigins });
  let continued = false;

  middleware(createRequest(), createResponse(), () => {
    continued = true;
  });

  assert.equal(continued, true);
});

test('rejects unsafe requests with a missing CSRF token', () => {
  const middleware = createCsrfProtection({ allowedOrigins });
  const response = createResponse();

  middleware(
    createRequest({ token: '', cookie: '' }),
    response,
    assert.fail,
  );

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.code, 'CSRF_TOKEN_INVALID');
});

test('rejects a CSRF header that does not match the cookie', () => {
  const middleware = createCsrfProtection({ allowedOrigins });
  const response = createResponse();

  middleware(createRequest({ token: 'b'.repeat(43) }), response, assert.fail);

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.code, 'CSRF_TOKEN_INVALID');
});

test('rejects matching but empty CSRF cookie and header values', () => {
  const middleware = createCsrfProtection({ allowedOrigins });
  const response = createResponse();

  middleware(createRequest({ cookie: 'portfolio_csrf=', token: '' }), response, assert.fail);

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.code, 'CSRF_TOKEN_INVALID');
});

test('rejects unsafe requests without an Origin header', () => {
  const middleware = createCsrfProtection({ allowedOrigins });
  const response = createResponse();

  middleware(createRequest({ origin: '' }), response, assert.fail);

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.code, 'CSRF_ORIGIN_FORBIDDEN');
});

test('rejects unsafe requests from an origin outside the exact allowlist', () => {
  const middleware = createCsrfProtection({ allowedOrigins });
  const response = createResponse();

  middleware(
    createRequest({ origin: 'https://attacker.example' }),
    response,
    assert.fail,
  );

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.code, 'CSRF_ORIGIN_FORBIDDEN');
});

test('does not require a CSRF token for safe methods', () => {
  const middleware = createCsrfProtection({ allowedOrigins });
  let continued = false;

  middleware(
    createRequest({
      method: 'GET',
      origin: undefined,
      cookie: undefined,
      token: undefined,
    }),
    createResponse(),
    () => {
      continued = true;
    },
  );

  assert.equal(continued, true);
});
