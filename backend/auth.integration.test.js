import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import test, { after, before } from 'node:test';
import { hashSessionToken } from './security/session.js';

const origin = 'http://localhost:5173';
let app;
let User;
let SiteContent;
let PortfolioItem;
let Session;
let LoginAttempt;
let mongo;
let server;
let baseUrl;

const getCsrf = async () => {
  const response = await fetch(`${baseUrl}/api/auth/csrf`, {
    headers: { Origin: origin },
  });
  assert.equal(response.status, 200);
  const { csrfToken } = await response.json();
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith('portfolio_csrf='))
    .split(';', 1)[0];

  return { csrfToken, cookie };
};

const login = async (email, password) => {
  const csrf = await getCsrf();
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      Cookie: csrf.cookie,
      'X-CSRF-Token': csrf.csrfToken,
    },
    body: JSON.stringify({ email, password }),
  });

  return { response, csrf };
};

const sessionCookieFrom = (response) =>
  response.headers
    .getSetCookie()
    .find((value) => value.startsWith('portfolio_session='))
    .split(';', 1)[0];

before(
  async () => {
    mongo = await MongoMemoryServer.create({
      binary: { version: '7.0.14' },
      instance: { dbName: 'life2_p01a_test' },
    });
    await mongoose.connect(mongo.getUri());

    [User, SiteContent, PortfolioItem, Session, LoginAttempt] = await Promise.all([
      import('./models/User.js').then((module) => module.default),
      import('./models/SiteContent.js').then((module) => module.default),
      import('./models/PortfolioItem.js').then((module) => module.default),
      import('./models/Session.js').then((module) => module.default),
      import('./models/LoginAttempt.js').then((module) => module.default),
    ]);
    app = (await import('./app.js')).default;
    await Promise.all([
      User.init(),
      SiteContent.init(),
      PortfolioItem.init(),
      Session.init(),
      LoginAttempt.init(),
    ]);

    await User.create([
      {
        name: 'Admin Test',
        email: 'admin@example.test',
        password: 'admin-password',
        isAdmin: true,
      },
      {
        name: 'Member Test',
        email: 'member@example.test',
        password: 'member-password',
        isAdmin: false,
      },
    ]);
    await SiteContent.create({
      locale: 'it',
      content: { title: 'Test portfolio content' },
    });
    await PortfolioItem.create({
      title: 'Test item',
      description: 'Synthetic integration fixture',
      image: '/test.png',
      technologies: ['test'],
    });

    server = createServer(app);
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  },
  { timeout: 180_000 },
);

after(
  async () => {
    if (server?.listening) {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await mongoose.disconnect();
    await mongo?.stop();
  },
  { timeout: 30_000 },
);

test('preserves public content and portfolio API responses', async () => {
  const content = await fetch(`${baseUrl}/api/content/it`, {
    headers: { Origin: origin },
  });
  assert.equal(content.status, 200);
  assert.deepEqual(await content.json(), { title: 'Test portfolio content' });

  const portfolio = await fetch(`${baseUrl}/api/portfolio`, {
    headers: { Origin: origin },
  });
  assert.equal(portfolio.status, 200);
  assert.equal((await portfolio.json()).length, 1);
});

test('login, current user, admin route, logout, and revoked-session reuse work end to end', async () => {
  const { response: loginResponse, csrf } = await login(
    'ADMIN@example.test',
    'admin-password',
  );
  assert.equal(loginResponse.status, 200);
  const user = await loginResponse.json();
  assert.deepEqual(user, {
    _id: user._id,
    name: 'Admin Test',
    email: 'admin@example.test',
    isAdmin: true,
  });
  assert.equal(Object.hasOwn(user, 'token'), false);

  const sessionCookie = sessionCookieFrom(loginResponse);
  const sessionToken = sessionCookie.split('=')[1];
  const cookieHeader = `${sessionCookie}; ${csrf.cookie}`;
  const currentUser = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Origin: origin, Cookie: cookieHeader },
  });
  assert.equal(currentUser.status, 200);
  assert.equal((await currentUser.json()).email, 'admin@example.test');
  assert.equal(currentUser.headers.get('cache-control'), 'no-store');

  const privateResponse = await fetch(`${baseUrl}/api/auth/private`, {
    headers: { Origin: origin, Cookie: cookieHeader },
  });
  assert.equal(privateResponse.status, 200);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Origin: origin,
      Cookie: cookieHeader,
      'X-CSRF-Token': csrf.csrfToken,
    },
  });
  assert.equal(logout.status, 204);
  assert.equal(logout.headers.getSetCookie().length, 2);

  const staleSession = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  assert.equal(staleSession.status, 401);
  const persistedSession = await Session.findOne({
    tokenHash: hashSessionToken(sessionToken),
  });
  assert.ok(persistedSession.revokedAt);
});

test('a non-admin can authenticate but receives 403 for the private area', async () => {
  const { response, csrf } = await login(
    'member@example.test',
    'member-password',
  );
  assert.equal(response.status, 200);

  const privateResponse = await fetch(`${baseUrl}/api/auth/private`, {
    headers: {
      Origin: origin,
      Cookie: `${sessionCookieFrom(response)}; ${csrf.cookie}`,
    },
  });
  assert.equal(privateResponse.status, 403);
});

test('login and logout reject missing CSRF tokens and untrusted origins', async () => {
  const noToken = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@example.test',
      password: 'admin-password',
    }),
  });
  assert.equal(noToken.status, 403);
  assert.equal((await noToken.json()).code, 'CSRF_TOKEN_INVALID');

  const csrf = await getCsrf();
  const untrustedOrigin = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Origin: 'https://attacker.example',
      Cookie: csrf.cookie,
      'X-CSRF-Token': csrf.csrfToken,
    },
  });
  assert.equal(untrustedOrigin.status, 403);
});

test('persistent login limiter blocks repeated failures and returns generic credential errors', async () => {
  const statuses = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { response } = await login('missing@example.test', 'wrong-password');
    statuses.push(response.status);
  }

  assert.deepEqual(statuses, [401, 401, 401, 401, 401, 429]);
});

test('MongoDB rate-limit increments remain atomic for concurrent failures', async () => {
  const responses = await Promise.all(
    Array.from({ length: 10 }, () =>
      login('parallel-missing@example.test', 'wrong-password'),
    ),
  );
  const statuses = responses.map(({ response }) => response.status).sort();

  assert.deepEqual(statuses, [401, 401, 401, 401, 401, 429, 429, 429, 429, 429]);
});

test('session expiry is checked by the API even before MongoDB TTL cleanup', async () => {
  const tokenHash = hashSessionToken('already-expired-session-token');
  await Session.create({
    tokenHash,
    userId: (await User.findOne({ email: 'admin@example.test' }))._id,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() - 1000),
    revokedAt: null,
  });

  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: `portfolio_session=already-expired-session-token` },
  });
  assert.equal(response.status, 401);
});

test('CORS preflight allows only configured origins with credentials', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-csrf-token',
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
});
