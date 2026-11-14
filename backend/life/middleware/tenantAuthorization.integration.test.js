import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import test, { after, before, beforeEach } from 'node:test';
import { entitlementRepository, Entitlement } from '../core/entitlementRepository.js';
import { membershipRepository, Membership } from '../core/membershipRepository.js';
import { tenantRepository, Tenant } from '../core/tenantRepository.js';
import { tenantService } from '../core/tenantService.js';
import {
  createTenantAuthorization,
  requireModuleEntitlement,
  requireTenantMembership,
} from './tenantAuthorization.js';

let mongo;
let server;
let baseUrl;
let app;

const startServer = async (serviceOverrides = {}) => {
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.get('x-test-user');
    if (userId) {
      req.user = {
        _id: userId,
        isAdmin: req.get('x-test-admin') === 'true',
      };
    }
    next();
  });

  const authorization = createTenantAuthorization(serviceOverrides);
  app.get('/tenant', authorization.requireTenantMembership, (req, res) =>
    res.json({
      tenantId: String(req.life.tenant._id),
      membershipId: String(req.life.membership._id),
    }),
  );
  app.post('/tenant', authorization.requireTenantMembership, (req, res) =>
    res.json({ tenantId: String(req.life.tenant._id) }),
  );
  app.get(
    '/finance',
    requireTenantMembership,
    requireModuleEntitlement('finance'),
    (_req, res) => res.json({ allowed: true }),
  );
  app.use((error, _req, res, _next) =>
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR' }),
  );

  server = createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
};

const getTenant = (tenantId, userId, path = '/tenant') =>
  fetch(`${baseUrl}${path}?tenantId=${tenantId}`, {
    headers: userId ? { 'x-test-user': String(userId) } : {},
  });

before(
  async () => {
    mongo = await MongoMemoryServer.create({
      binary: { version: '7.0.14' },
      instance: { dbName: 'life2_p01b_authorization_test' },
    });
    await mongoose.connect(mongo.getUri());
    await Promise.all([Tenant.init(), Membership.init(), Entitlement.init()]);
    await startServer();
  },
  { timeout: 180_000 },
);

beforeEach(async () => {
  await Promise.all([
    Tenant.deleteMany({}),
    Membership.deleteMany({}),
    Entitlement.deleteMany({}),
  ]);
});

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

test('requires authentication and an explicit valid tenant query parameter', async () => {
  const tenantId = new mongoose.Types.ObjectId();

  const unauthenticated = await getTenant(tenantId);
  assert.equal(unauthenticated.status, 401);
  assert.equal((await unauthenticated.json()).code, 'AUTHENTICATION_REQUIRED');

  const missing = await fetch(`${baseUrl}/tenant`, {
    headers: { 'x-test-user': new mongoose.Types.ObjectId().toString() },
  });
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).code, 'TENANT_CONTEXT_REQUIRED');

  const invalid = await getTenant('not-an-object-id', new mongoose.Types.ObjectId());
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, 'TENANT_ID_INVALID');
});

test('does not trust tenant identifiers supplied in the request body', async () => {
  const tenant = await tenantService.createSharedTenant('Body tenant');
  const userId = new mongoose.Types.ObjectId();
  await membershipRepository.create({
    userId,
    tenantId: tenant._id,
    role: 'member',
  });

  const response = await fetch(`${baseUrl}/tenant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-user': userId.toString(),
    },
    body: JSON.stringify({ tenantId: tenant._id.toString() }),
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'TENANT_CONTEXT_REQUIRED');
});

test('denies a user who guesses another tenant ID, even when req.user isAdmin', async () => {
  const tenant = await tenantService.createSharedTenant('Other tenant');
  const otherUserId = new mongoose.Types.ObjectId();
  await membershipRepository.create({
    userId: new mongoose.Types.ObjectId(),
    tenantId: tenant._id,
    role: 'owner',
  });

  const response = await fetch(
    `${baseUrl}/tenant?tenantId=${tenant._id.toString()}`,
    {
      headers: {
        'x-test-user': otherUserId.toString(),
        'x-test-admin': 'true',
      },
    },
  );
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'TENANT_ACCESS_DENIED');
});

test('denies suspended membership and suspended tenant contexts', async () => {
  const tenant = await tenantService.createSharedTenant('Suspended test');
  const userId = new mongoose.Types.ObjectId();
  const membership = await membershipRepository.create({
    userId,
    tenantId: tenant._id,
    role: 'member',
  });

  await membershipRepository.updateStatus(membership._id, 'suspended');
  assert.equal((await getTenant(tenant._id, userId)).status, 403);

  await membershipRepository.updateStatus(membership._id, 'active');
  await tenantRepository.updateStatus(tenant._id, 'suspended');
  assert.equal((await getTenant(tenant._id, userId)).status, 403);
});

test('requires an active entitlement and denies the unimplemented Finance module', async () => {
  const tenant = await tenantService.createSharedTenant('Finance tenant');
  const userId = new mongoose.Types.ObjectId();
  await membershipRepository.create({
    userId,
    tenantId: tenant._id,
    role: 'member',
  });
  await entitlementRepository.create({
    tenantId: tenant._id,
    moduleKey: 'finance',
  });

  const response = await getTenant(tenant._id, userId, '/finance');
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    success: false,
    code: 'MODULE_ACCESS_DENIED',
    details: 'unimplemented_module',
  });
});

test('forwards membership resolution failures to Express error handling', async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  server = undefined;

  const failingApp = express();
  failingApp.use((req, _res, next) => {
    req.user = { _id: new mongoose.Types.ObjectId() };
    next();
  });
  const authorization = createTenantAuthorization({
    membershipService: {
      async resolveActiveMembershipAndTenant() {
        throw new Error('synthetic repository failure');
      },
    },
  });
  failingApp.get('/tenant', authorization.requireTenantMembership);
  failingApp.use((_error, _req, res, _next) =>
    res.status(500).json({ code: 'INTERNAL_ERROR' }),
  );

  const failingServer = createServer(failingApp);
  await new Promise((resolve, reject) => {
    failingServer.once('error', reject);
    failingServer.listen(0, '127.0.0.1', resolve);
  });

  try {
    const response = await fetch(
      `http://127.0.0.1:${failingServer.address().port}/tenant?tenantId=${new mongoose.Types.ObjectId()}`,
      { headers: { 'x-test-user': new mongoose.Types.ObjectId().toString() } },
    );
    assert.equal(response.status, 500);
    assert.equal((await response.json()).code, 'INTERNAL_ERROR');
  } finally {
    await new Promise((resolve, reject) =>
      failingServer.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
