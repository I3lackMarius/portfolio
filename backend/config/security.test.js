import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSecurityConfig } from './security.js';

test('uses only the local Vite origins and a 24-hour session by default outside production', () => {
  const config = loadSecurityConfig({ NODE_ENV: 'test' });

  assert.deepEqual([...config.allowedOrigins], [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);
  assert.equal(config.sessionMaxAgeMs, 24 * 60 * 60 * 1000);
  assert.equal(config.isProduction, false);
});

test('requires explicit exact origins and a strong shared limiter key in production', () => {
  assert.throws(
    () => loadSecurityConfig({ NODE_ENV: 'production' }),
    /APP_ORIGINS/,
  );
  assert.throws(
    () =>
      loadSecurityConfig({
        NODE_ENV: 'production',
        APP_ORIGINS: 'https://www.negrumarius.com',
      }),
    /LOGIN_RATE_LIMIT_SECRET/,
  );
});

test('rejects wildcard, path, and non-HTTP origins', () => {
  for (const origin of [
    'https://*.negrumarius.com',
    'https://www.negrumarius.com/private',
    'file://local',
  ]) {
    assert.throws(
      () =>
        loadSecurityConfig({
          NODE_ENV: 'production',
          APP_ORIGINS: origin,
          LOGIN_RATE_LIMIT_SECRET: 'test-only-secret-that-is-long-enough',
        }),
      /APP_ORIGINS/,
    );
  }
});

test('caps session age at 24 hours while allowing shorter configured sessions', () => {
  assert.equal(
    loadSecurityConfig({
      NODE_ENV: 'test',
      SESSION_MAX_AGE_MS: '3600000',
    }).sessionMaxAgeMs,
    60 * 60 * 1000,
  );
  assert.throws(
    () =>
      loadSecurityConfig({
        NODE_ENV: 'test',
        SESSION_MAX_AGE_MS: '86400001',
      }),
    /SESSION_MAX_AGE_MS/,
  );
});
