import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import test, { after, before, beforeEach } from 'node:test';
import { Membership } from './membershipRepository.js';
import { Tenant } from './tenantRepository.js';
import { membershipRepository } from './membershipRepository.js';
import { provisioningService } from './provisioningService.js';

let mongo;

before(
  async () => {
    mongo = await MongoMemoryServer.create({
      binary: { version: '7.0.14' },
      instance: { dbName: 'life2_p01b_provision_test' },
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

test('provisions an owner membership and is idempotent under concurrent calls', async () => {
  const userId = new mongoose.Types.ObjectId();
  const workspaces = await Promise.all([
    provisioningService.provisionPersonalWorkspace(userId),
    provisioningService.provisionPersonalWorkspace(userId),
  ]);

  assert.equal(
    workspaces[0].tenant._id.toString(),
    workspaces[1].tenant._id.toString(),
  );
  assert.equal(
    workspaces[0].membership._id.toString(),
    workspaces[1].membership._id.toString(),
  );
  assert.equal(workspaces[0].membership.role, 'owner');
  assert.equal(await Tenant.countDocuments({ personalOwnerId: userId }), 1);
  assert.equal(await Membership.countDocuments({ userId }), 1);
});

test('does not silently elevate an existing membership during provisioning', async () => {
  const userId = new mongoose.Types.ObjectId();
  const tenant = await Tenant.create({
    name: 'Existing personal workspace',
    type: 'personal',
    personalOwnerId: userId,
  });
  const membership = await membershipRepository.create({
    userId,
    tenantId: tenant._id,
    role: 'member',
  });

  const result = await provisioningService.provisionPersonalWorkspace(userId);
  assert.equal(result.membership._id.toString(), membership._id.toString());
  assert.equal(result.membership.role, 'member');
});

test('rejects invalid user identifiers before writing data', async () => {
  await assert.rejects(
    provisioningService.provisionPersonalWorkspace('not-an-object-id'),
    TypeError,
  );
  assert.equal(await Tenant.countDocuments(), 0);
  assert.equal(await Membership.countDocuments(), 0);
});
