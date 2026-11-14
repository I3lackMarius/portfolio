import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import test, { after, before, beforeEach } from 'node:test';
import { entitlementRepository, Entitlement } from './entitlementRepository.js';
import {
  createEntitlementService,
  entitlementService,
} from './entitlementService.js';
import { listModuleDefinitions } from './moduleRegistry.js';
import { membershipRepository, Membership } from './membershipRepository.js';
import { membershipService } from './membershipService.js';
import { tenantRepository, Tenant } from './tenantRepository.js';
import { tenantService } from './tenantService.js';

let mongo;
const financeEnabledForPolicyTests = createEntitlementService({
  getModule: (moduleKey) =>
    moduleKey === 'finance' ? { implemented: true } : null,
});

before(
  async () => {
    mongo = await MongoMemoryServer.create({
      binary: { version: '7.0.14' },
      instance: { dbName: 'life2_p01b_entitlement_test' },
    });
    await mongoose.connect(mongo.getUri());
    await Promise.all([Tenant.init(), Membership.init(), Entitlement.init()]);
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
    await mongoose.disconnect();
    await mongo?.stop();
  },
  { timeout: 30_000 },
);

test('entitlements are tenant-scoped and the compound unique index is active', async () => {
  const firstTenant = await tenantService.createSharedTenant('First');
  const secondTenant = await tenantService.createSharedTenant('Second');
  const first = await entitlementService.createEntitlement(
    firstTenant._id,
    'finance',
  );
  const second = await entitlementService.createEntitlement(
    secondTenant._id,
    'finance',
  );

  await assert.rejects(
    entitlementService.createEntitlement(firstTenant._id, 'finance'),
    (error) => error.code === 11000,
  );

  assert.equal(first.status, 'active');
  assert.equal(second.status, 'active');
  const secondTenantEntitlements =
    await entitlementRepository.findByTenantId(secondTenant._id);
  assert.equal(secondTenantEntitlements.length, 1);
  assert.equal(
    secondTenantEntitlements[0]._id.toString(),
    (
      await entitlementRepository.findByTenantAndModule(
        secondTenant._id,
        'finance',
      )
    )._id.toString(),
  );

  const indexes = await Entitlement.collection.indexes();
  assert.ok(
    indexes.some(
      (index) =>
        index.unique === true &&
        index.key.tenantId === 1 &&
        index.key.moduleKey === 1,
    ),
  );
});

test('schema and service reject unknown module keys', async () => {
  const tenant = await tenantService.createSharedTenant('Tenant');

  assert.throws(
    () => entitlementService.createEntitlement(tenant._id, 'unknown'),
    /unknown module/i,
  );
  await assert.rejects(
    entitlementRepository.create({
      tenantId: tenant._id,
      moduleKey: 'unknown',
    }),
    (error) => error.name === 'ValidationError',
  );
});

test('an active Finance entitlement does not enable the unimplemented module', async () => {
  const tenant = await tenantService.createSharedTenant('Finance only');
  const userId = new mongoose.Types.ObjectId();
  await membershipService.createMembership(userId, tenant._id, 'member');
  await entitlementService.createEntitlement(tenant._id, 'finance');

  const result = await entitlementService.resolveEntitlementAccess(
    userId,
    tenant._id,
    'finance',
  );
  assert.deepEqual(result, {
    allowed: false,
    reason: 'unimplemented_module',
  });
  assert.equal(listModuleDefinitions()[0].implemented, false);
});

test('membership and entitlement lookups remain isolated between tenants', async () => {
  const firstTenant = await tenantService.createSharedTenant('First tenant');
  const secondTenant = await tenantService.createSharedTenant('Second tenant');
  const firstUserId = new mongoose.Types.ObjectId();
  const secondUserId = new mongoose.Types.ObjectId();

  await membershipService.createMembership(
    firstUserId,
    firstTenant._id,
    'member',
  );
  await membershipService.createMembership(
    secondUserId,
    secondTenant._id,
    'member',
  );
  await entitlementService.createEntitlement(firstTenant._id, 'finance');
  await entitlementService.createEntitlement(secondTenant._id, 'finance');

  assert.deepEqual(
    (await membershipRepository.findActiveByUserId(firstUserId)).map((item) =>
      item.tenantId.toString(),
    ),
    [firstTenant._id.toString()],
  );
  assert.equal(
    (await entitlementRepository.findByTenantId(firstTenant._id)).length,
    1,
  );
  assert.equal(
    (
      await financeEnabledForPolicyTests.resolveEntitlementAccess(
        firstUserId,
        secondTenant._id,
        'finance',
      )
    ).reason,
    'missing_membership',
  );
  assert.equal(
    (
      await financeEnabledForPolicyTests.resolveEntitlementAccess(
        firstUserId,
        firstTenant._id,
        'finance',
      )
    ).allowed,
    true,
  );
});

test('access resolution requires an active tenant, membership, and entitlement', async () => {
  const tenant = await tenantService.createSharedTenant('Tenant');
  const userId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  const membership = await membershipService.createMembership(
    userId,
    tenant._id,
    'member',
  );
  const entitlement = await entitlementService.createEntitlement(
    tenant._id,
    'finance',
  );

  assert.equal(
    (
      await financeEnabledForPolicyTests.resolveEntitlementAccess(
        otherUserId,
        tenant._id,
        'finance',
      )
    ).reason,
    'missing_membership',
  );
  assert.equal(
    (
      await financeEnabledForPolicyTests.resolveEntitlementAccess(
        userId,
        tenant._id,
        'unknown',
      )
    ).reason,
    'unknown_module',
  );
  assert.equal(
    (
      await financeEnabledForPolicyTests.resolveEntitlementAccess(
        userId,
        tenant._id,
        'finance',
      )
    ).allowed,
    true,
  );

  await membershipRepository.updateStatus(membership._id, 'suspended');
  assert.equal(
    (
      await financeEnabledForPolicyTests.resolveEntitlementAccess(
        userId,
        tenant._id,
        'finance',
      )
    ).reason,
    'inactive_membership',
  );

  await membershipRepository.updateStatus(membership._id, 'active');
  await entitlementRepository.updateStatus(entitlement._id, 'suspended');
  assert.equal(
    (
      await financeEnabledForPolicyTests.resolveEntitlementAccess(
        userId,
        tenant._id,
        'finance',
      )
    ).reason,
    'inactive_entitlement',
  );

  await entitlementRepository.updateStatus(entitlement._id, 'active');
  await tenantRepository.updateStatus(tenant._id, 'suspended');
  assert.equal(
    (
      await financeEnabledForPolicyTests.resolveEntitlementAccess(
        userId,
        tenant._id,
        'finance',
      )
    ).reason,
    'inactive_tenant',
  );
});
