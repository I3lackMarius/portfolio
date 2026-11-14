import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countLocaleContent,
  readLocaleDocuments,
  seedSiteContent,
} from './seedSiteContent.js';

test('loads both original locale resources without changing their shape', async () => {
  const documents = await readLocaleDocuments();

  assert.deepEqual(
    documents.map(({ locale }) => locale),
    ['it', 'gb'],
  );
  assert.ok(documents.every(({ content }) => content.About && content.Works));
  assert.deepEqual(countLocaleContent(documents[0].content), {
    projects: 3,
    experiences: 8,
    technologies: 10,
    feedbacks: 1,
  });
});

test('dry-run reports counts without connecting to or writing to MongoDB', async () => {
  let connected = false;
  let wrote = false;

  const results = await seedSiteContent({
    dryRun: true,
    connect: async () => { connected = true; },
    model: {
      updateOne: async () => { wrote = true; },
    },
  });

  assert.equal(connected, false);
  assert.equal(wrote, false);
  assert.deepEqual(results.map(({ status }) => status), ['dry-run', 'dry-run']);
  assert.deepEqual(results.map(({ locale }) => locale), ['it', 'gb']);
});

test('default seed mode inserts only missing locale documents', async () => {
  const updates = [];
  let disconnected = false;

  const results = await seedSiteContent({
    connect: async () => {},
    disconnect: async () => { disconnected = true; },
    model: {
      updateOne: async (...args) => {
        updates.push(args);
        return { upsertedCount: 1, modifiedCount: 0 };
      },
    },
  });

  assert.equal(disconnected, true);
  assert.equal(updates.length, 2);
  assert.ok(updates.every(([, update]) => '$setOnInsert' in update));
  assert.deepEqual(results.map(({ status }) => status), ['inserted', 'inserted']);
});

test('replace mode explicitly updates existing content', async () => {
  const updates = [];

  await seedSiteContent({
    replace: true,
    connect: async () => {},
    disconnect: async () => {},
    model: {
      updateOne: async (...args) => {
        updates.push(args);
        return { upsertedCount: 0, modifiedCount: 1 };
      },
    },
  });

  assert.equal(updates.length, 2);
  assert.ok(updates.every(([, update]) => '$set' in update));
  assert.ok(updates.every(([, update]) => '$setOnInsert' in update));
});
