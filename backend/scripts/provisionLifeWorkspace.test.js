import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import test, { after, before, beforeEach } from 'node:test';
import User from '../models/User.js';
import {
  Entitlement,
  entitlementRepository,
} from '../life/core/entitlementRepository.js';
import {
  Membership,
  membershipRepository,
} from '../life/core/membershipRepository.js';
import { Tenant } from '../life/core/tenantRepository.js';
import { listModuleDefinitions } from '../life/core/moduleRegistry.js';
import { provisionLifeWorkspace } from './provisionLifeWorkspace.js';

let mongo;

before(
  async () => {
    mongo = await MongoMemoryServer.create({
      binary: { version: '7.0.14' },
      instance: { dbName: 'life2_p01b_provision_script_test' },
    });
    await mongoose.connect(mongo.getUri());
    await Promise.all([
      User.init(),
      Tenant.init(),
      Membership.init(),
      Entitlement.init(),
    ]);
  },
  { timeout: 180_000 },
);

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
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

const createUser = () =>
  User.create({
    name: 'Synthetic Provisioning User',
    email: 'provisioning@example.test',
    password: 'synthetic-password',
  });

test('dry-run validates the user without writing workspace or entitlement data', async () => {
  const user = await createUser();

  const result = await provisionLifeWorkspace({
    userId: user._id,
    moduleKeys: ['finance'],
  });

  assert.deepEqual(result, { dryRun: true, moduleKeys: ['finance'] });
  assert.equal(await Tenant.countDocuments(), 0);
  assert.equal(await Membership.countDocuments(), 0);
  assert.equal(await Entitlement.countDocuments(), 0);
});

test('Finance-only provisioning stays limited and does not reactivate suspension', async () => {
  const user = await createUser();

  await provisionLifeWorkspace({
    userId: user._id,
    moduleKeys: ['finance'],
    apply: true,
  });

  const [entitlement] = await entitlementRepository.findByTenantId(
    (await Tenant.findOne({ personalOwnerId: user._id }))._id,
  );
  await entitlementRepository.updateStatus(entitlement._id, 'suspended');

  const repeated = await provisionLifeWorkspace({
    userId: user._id,
    moduleKeys: ['finance'],
    apply: true,
  });
  const storedEntitlements = await entitlementRepository.findByTenantId(
    entitlement.tenantId,
  );

  assert.equal(storedEntitlements.length, 1);
  assert.equal(storedEntitlements[0].moduleKey, 'finance');
  assert.equal(storedEntitlements[0].status, 'suspended');
  assert.deepEqual(repeated.entitlements, [
    { moduleKey: 'finance', result: 'unchanged', status: 'suspended' },
  ]);
});

test('explicit all-module provisioning is idempotent under concurrent calls', async () => {
  const user = await createUser();
  const moduleKeys = listModuleDefinitions().map(({ key }) => key);

  await Promise.all([
    provisionLifeWorkspace({ userId: user._id, moduleKeys, apply: true }),
    provisionLifeWorkspace({ userId: user._id, moduleKeys, apply: true }),
  ]);

  const [tenant] = await Tenant.find({ personalOwnerId: user._id });
  const memberships = await membershipRepository.findByTenantAndUser(
    tenant._id,
    user._id,
  );
  const entitlements = await entitlementRepository.findByTenantId(tenant._id);

  assert.equal(await Tenant.countDocuments({ personalOwnerId: user._id }), 1);
  assert.equal(await Membership.countDocuments({ userId: user._id }), 1);
  assert.equal(memberships.role, 'owner');
  assert.deepEqual(
    entitlements.map(({ moduleKey }) => moduleKey).sort(),
    [...moduleKeys].sort(),
  );
});

test('rejects unknown modules without provisioning a workspace', async () => {
  const user = await createUser();

  await assert.rejects(
    provisionLifeWorkspace({
      userId: user._id,
      moduleKeys: ['finance', 'unknown'],
      apply: true,
    }),
    /unknown module/i,
  );
  assert.equal(await Tenant.countDocuments(), 0);
  assert.equal(await Membership.countDocuments(), 0);
  assert.equal(await Entitlement.countDocuments(), 0);
});
