import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import test, { after, before, beforeEach } from 'node:test';
import { membershipRepository, Membership } from './membershipRepository.js';
import { membershipService } from './membershipService.js';
import { tenantRepository, Tenant } from './tenantRepository.js';
import { tenantService } from './tenantService.js';

let mongo;

before(
  async () => {
    mongo = await MongoMemoryServer.create({
      binary: { version: '7.0.14' },
      instance: { dbName: 'life2_p01b_core_test' },
    });
    await mongoose.connect(mongo.getUri());
    await Promise.all([Tenant.init(), Membership.init()]);
  },
  { timeout: 180_000 },
);

beforeEach(async () => {
  await Promise.all([Tenant.deleteMany({}), Membership.deleteMany({})]);
});

after(
  async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  },
  { timeout: 30_000 },
);

test('personal tenants require an owner and enforce uniqueness only for personal tenants', async () => {
  const ownerId = new mongoose.Types.ObjectId();

  await assert.rejects(
    tenantRepository.create({ name: 'Invalid personal tenant', type: 'personal' }),
    (error) => error.name === 'ValidationError',
  );

  const personal = await tenantService.createPersonalTenant(ownerId, 'Personal');
  assert.equal(personal.status, 'active');
  assert.ok(personal.createdAt instanceof Date);
  await assert.rejects(
    tenantService.createPersonalTenant(ownerId, 'Duplicate personal'),
    (error) => error.code === 11000,
  );

  await tenantService.createSharedTenant('Shared one');
  await tenantService.createSharedTenant('Shared two');
  assert.equal(await Tenant.countDocuments(), 3);
});

test('membership roles and statuses are validated and membership is unique per tenant/user', async () => {
  const tenant = await tenantService.createSharedTenant('Shared');
  const userId = new mongoose.Types.ObjectId();

  const membership = await membershipService.createMembership(
    userId,
    tenant._id,
    'owner',
  );
  assert.equal(membership.status, 'active');

  await assert.rejects(
    membershipService.createMembership(userId, tenant._id),
    (error) => error.code === 11000,
  );
  await assert.rejects(
    membershipRepository.create({
      userId: new mongoose.Types.ObjectId(),
      tenantId: tenant._id,
      role: 'invalid',
    }),
    (error) => error.name === 'ValidationError',
  );
});

test('personal tenant provisioning is idempotent under concurrent requests', async () => {
  const ownerId = new mongoose.Types.ObjectId();
  const tenants = await Promise.all([
    tenantService.getOrCreatePersonalTenant(ownerId, 'First name'),
    tenantService.getOrCreatePersonalTenant(ownerId, 'Second name'),
  ]);

  assert.equal(tenants[0]._id.toString(), tenants[1]._id.toString());
  assert.equal(await Tenant.countDocuments({ personalOwnerId: ownerId }), 1);
});

test('membership resolution requires both an active membership and tenant', async () => {
  const tenant = await tenantService.createSharedTenant('Shared');
  const userId = new mongoose.Types.ObjectId();
  await membershipService.createMembership(userId, tenant._id, 'member');

  assert.ok(
    await membershipService.resolveActiveMembershipAndTenant(
      userId,
      tenant._id,
    ),
  );

  await membershipRepository.updateStatus(
    (await membershipRepository.findByTenantAndUser(tenant._id, userId))._id,
    'suspended',
  );
  assert.equal(
    await membershipService.resolveActiveMembershipAndTenant(
      userId,
      tenant._id,
    ),
    null,
  );
});
