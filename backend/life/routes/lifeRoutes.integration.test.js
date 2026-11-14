import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import test, { after, before, beforeEach } from 'node:test';
import app from '../../app.js';
import { Entitlement } from '../core/entitlementRepository.js';
import { Membership } from '../core/membershipRepository.js';
import { Tenant } from '../core/tenantRepository.js';
import { membershipRepository } from '../core/membershipRepository.js';
import { entitlementRepository } from '../core/entitlementRepository.js';
import { tenantService } from '../core/tenantService.js';
import { tenantRepository } from '../core/tenantRepository.js';
import { hashSessionToken, sessionCookieName } from '../../security/session.js';
import User from '../../models/User.js';
import Session from '../../models/Session.js';
import vercelWorkspacesHandler from '../../../api/life/v1/workspaces.js';

let mongo;
let server;
let vercelServer;
let baseUrl;
let vercelBaseUrl;

const createAuthenticatedUser = async (email) => {
  const user = await User.create({
    name: 'Synthetic Life User',
    email,
    password: 'synthetic-password',
  });
  const token = randomBytes(32).toString('hex');
  await Session.create({
    tokenHash: hashSessionToken(token),
    userId: user._id,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
  });

  return {
    user,
    cookie: `${sessionCookieName(false)}=${token}`,
  };
};

const getJson = (url, cookie) =>
  fetch(url, {
    headers: {
      Origin: 'http://localhost:5173',
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

before(
  async () => {
    mongo = await MongoMemoryServer.create({
      binary: { version: '7.0.14' },
      instance: { dbName: 'life2_p01b_api_test' },
    });
    process.env.MONGODB_URI = mongo.getUri();
    await mongoose.connect(mongo.getUri());
    await Promise.all([
      User.init(),
      Session.init(),
      Tenant.init(),
      Membership.init(),
      Entitlement.init(),
    ]);

    server = createServer(app);
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    vercelServer = createServer(vercelWorkspacesHandler);
    await new Promise((resolve, reject) => {
      vercelServer.once('error', reject);
      vercelServer.listen(0, '127.0.0.1', resolve);
    });
    vercelBaseUrl = `http://127.0.0.1:${vercelServer.address().port}`;
  },
  { timeout: 180_000 },
);

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Session.deleteMany({}),
    Tenant.deleteMany({}),
    Membership.deleteMany({}),
    Entitlement.deleteMany({}),
  ]);
});

after(
  async () => {
    for (const activeServer of [server, vercelServer]) {
      if (activeServer?.listening) {
        await new Promise((resolve, reject) =>
          activeServer.close((error) =>
            error ? reject(error) : resolve(),
          ),
        );
      }
    }
    await mongoose.disconnect();
    await mongo?.stop();
  },
  { timeout: 30_000 },
);

test('workspaces lists only active memberships in active tenants', async () => {
  const { user, cookie } = await createAuthenticatedUser(
    'workspaces@example.test',
  );
  const activeTenant = await tenantService.createSharedTenant('Active');
  const suspendedTenant = await tenantService.createSharedTenant('Suspended');
  const suspendedMembershipTenant =
    await tenantService.createSharedTenant('Inactive membership');

  await membershipRepository.create({
    userId: user._id,
    tenantId: activeTenant._id,
    role: 'owner',
  });
  const suspendedMembership = await membershipRepository.create({
    userId: user._id,
    tenantId: suspendedMembershipTenant._id,
    role: 'member',
  });
  await membershipRepository.updateStatus(suspendedMembership._id, 'suspended');
  await membershipRepository.create({
    userId: user._id,
    tenantId: suspendedTenant._id,
    role: 'member',
  });
  await tenantRepository.updateStatus(suspendedTenant._id, 'suspended');

  const response = await getJson(
    `${baseUrl}/api/life/v1/workspaces`,
    cookie,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    workspaces: [
      {
        id: activeTenant._id.toString(),
        name: 'Active',
        type: 'shared',
        role: 'owner',
      },
    ],
  });
});

test('context validates selection and returns server-derived modules and membership', async () => {
  const { user, cookie } = await createAuthenticatedUser(
    'context@example.test',
  );
  const tenant = await tenantService.createSharedTenant('Context');
  await membershipRepository.create({
    userId: user._id,
    tenantId: tenant._id,
    role: 'member',
  });
  await entitlementRepository.create({
    tenantId: tenant._id,
    moduleKey: 'finance',
  });

  const missing = await getJson(`${baseUrl}/api/life/v1/context`, cookie);
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).code, 'TENANT_CONTEXT_REQUIRED');

  const invalid = await getJson(
    `${baseUrl}/api/life/v1/context?tenantId=invalid`,
    cookie,
  );
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, 'TENANT_ID_INVALID');

  const response = await getJson(
    `${baseUrl}/api/life/v1/context?tenantId=${tenant._id}`,
    cookie,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    tenant: {
      id: tenant._id.toString(),
      name: 'Context',
      type: 'shared',
    },
    membership: { role: 'member' },
    modules: [
      {
        key: 'finance',
        name: 'Finance',
        implemented: false,
        entitled: true,
        available: false,
      },
      {
        key: 'productivity',
        name: 'Productivity',
        implemented: false,
        entitled: false,
        available: false,
      },
      {
        key: 'health',
        name: 'Health',
        implemented: false,
        entitled: false,
        available: false,
      },
      {
        key: 'journal',
        name: 'Journal',
        implemented: false,
        entitled: false,
        available: false,
      },
    ],
  });
});

test('an administrator without a workspace receives an empty list and no bootstrap route', async () => {
  const { user, cookie } = await createAuthenticatedUser(
    'admin-without-workspace@example.test',
  );
  user.isAdmin = true;
  await user.save();

  const workspaces = await getJson(
    `${baseUrl}/api/life/v1/workspaces`,
    cookie,
  );
  assert.equal(workspaces.status, 200);
  assert.deepEqual(await workspaces.json(), { workspaces: [] });

  const bootstrap = await getJson(
    `${baseUrl}/api/life/v1/bootstrap`,
    cookie,
  );
  assert.equal(bootstrap.status, 404);
  assert.equal(await Tenant.countDocuments(), 0);
});

test('requires a valid session and denies guessed tenant IDs', async () => {
  const targetTenant = await tenantService.createSharedTenant('Private');
  const targetIdentity = await createAuthenticatedUser('owner@example.test');
  const attacker = await createAuthenticatedUser('attacker@example.test');
  attacker.user.isAdmin = true;
  await attacker.user.save();
  await membershipRepository.create({
    userId: targetIdentity.user._id,
    tenantId: targetTenant._id,
    role: 'owner',
  });

  const unauthenticated = await getJson(
    `${baseUrl}/api/life/v1/workspaces`,
  );
  assert.equal(unauthenticated.status, 401);

  const forbidden = await getJson(
    `${baseUrl}/api/life/v1/context?tenantId=${targetTenant._id}`,
    attacker.cookie,
  );
  assert.equal(forbidden.status, 403);
  assert.equal((await forbidden.json()).code, 'TENANT_ACCESS_DENIED');
});

test('explicit Vercel Function entry point dispatches the versioned route', async () => {
  const { user, cookie } = await createAuthenticatedUser(
    'vercel@example.test',
  );
  const tenant = await tenantService.createSharedTenant('Vercel function');
  await membershipRepository.create({
    userId: user._id,
    tenantId: tenant._id,
    role: 'owner',
  });

  const response = await getJson(
    `${vercelBaseUrl}/api/life/v1/workspaces`,
    cookie,
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).workspaces[0].id, tenant._id.toString());
});
