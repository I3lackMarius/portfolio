import assert from 'node:assert/strict';
import test from 'node:test';
import { createGetSiteContent } from './siteContentController.js';

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

test('returns the exact stored locale content', async () => {
  const content = { Hero: { Iam: 'Ciao' }, Works: { Projects: [] } };
  const handler = createGetSiteContent({
    findOne: () => ({ lean: async () => ({ content }) }),
  });
  const response = createResponse();

  await handler({ params: { locale: 'it' } }, response, assert.fail);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, content);
});

test('rejects unsupported locales before querying MongoDB', async () => {
  const handler = createGetSiteContent({
    findOne: () => assert.fail('Unexpected database query'),
  });
  const response = createResponse();

  await handler({ params: { locale: 'en' } }, response, assert.fail);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: 'Unsupported locale' });
});

test('returns 404 when a supported locale has not been seeded', async () => {
  const handler = createGetSiteContent({
    findOne: () => ({ lean: async () => null }),
  });
  const response = createResponse();

  await handler({ params: { locale: 'gb' } }, response, assert.fail);

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'Content not found' });
});

test('forwards database errors to the Express error handler', async () => {
  const databaseError = new Error('database unavailable');
  const handler = createGetSiteContent({
    findOne: () => ({ lean: async () => { throw databaseError; } }),
  });
  const response = createResponse();
  let forwardedError;

  await handler(
    { params: { locale: 'it' } },
    response,
    (error) => { forwardedError = error; },
  );

  assert.equal(forwardedError, databaseError);
});
