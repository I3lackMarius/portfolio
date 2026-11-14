import assert from 'node:assert/strict';
import test from 'node:test';
import { promoteAdmin } from './promoteAdmin.js';

test('requires an email before connecting to MongoDB', async () => {
  let connected = false;

  await assert.rejects(
    promoteAdmin({ email: '', connect: async () => { connected = true; } }),
    /ADMIN_EMAIL is required/,
  );

  assert.equal(connected, false);
});

test('promotes only the matching existing account', async () => {
  let query;
  let update;
  let disconnected = false;

  const result = await promoteAdmin({
    email: '  TEST@Example.com ',
    connect: async () => {},
    disconnect: async () => { disconnected = true; },
    UserModel: {
      findOneAndUpdate(filter, updateDocument) {
        query = filter;
        update = updateDocument;
        return { select: async () => ({ _id: 'existing-id' }) };
      },
    },
  });

  assert.equal(result, true);
  assert.equal(query.email instanceof RegExp, true);
  assert.equal(query.email.test('test@example.com'), true);
  assert.equal(query.email.test('TEST@EXAMPLE.COM'), true);
  assert.deepEqual(update, {
    $set: { email: 'test@example.com', isAdmin: true },
  });
  assert.equal(disconnected, true);
});

test('does not create an account when the requested email does not exist', async () => {
  let disconnected = false;

  await assert.rejects(
    promoteAdmin({
      email: 'missing@example.com',
      connect: async () => {},
      disconnect: async () => { disconnected = true; },
      UserModel: {
        findOneAndUpdate: () => ({ select: async () => null }),
      },
    }),
    /No existing user matches ADMIN_EMAIL/,
  );

  assert.equal(disconnected, true);
});
