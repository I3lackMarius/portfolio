import './env.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const parseSessionMaxAge = (value) => {
  if (value === undefined || value === '') {
    return DAY_MS;
  }

  const maxAge = Number(value);
  if (!Number.isSafeInteger(maxAge) || maxAge <= 0 || maxAge > DAY_MS) {
    throw new Error('SESSION_MAX_AGE_MS must be a positive integer no greater than 24 hours');
  }

  return maxAge;
};

const parseAllowedOrigins = (value, isProduction) => {
  const origins = value
    ? value.split(',').map((origin) => origin.trim()).filter(Boolean)
    : isProduction
      ? []
      : DEVELOPMENT_ORIGINS;

  if (isProduction && origins.length === 0) {
    throw new Error('APP_ORIGINS must list the exact allowed browser origins in production');
  }

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('APP_ORIGINS must contain valid exact origins');
    }

    if (
      parsed.origin !== origin ||
      !['http:', 'https:'].includes(parsed.protocol) ||
      origin.includes('*')
    ) {
      throw new Error('APP_ORIGINS must contain valid exact origins without wildcards or paths');
    }
  }

  return new Set(origins);
};

export const loadSecurityConfig = (env = process.env) => {
  const isProduction = env.NODE_ENV === 'production';
  const allowedOrigins = parseAllowedOrigins(env.APP_ORIGINS, isProduction);
  const rateLimitSecret = env.LOGIN_RATE_LIMIT_SECRET;

  if (isProduction && (!rateLimitSecret || rateLimitSecret.length < 32)) {
    throw new Error('LOGIN_RATE_LIMIT_SECRET must contain at least 32 characters in production');
  }

  return Object.freeze({
    allowedOrigins,
    sessionMaxAgeMs: parseSessionMaxAge(env.SESSION_MAX_AGE_MS),
    loginRateLimitSecret:
      rateLimitSecret || 'local-development-only-rate-limit-secret',
    isProduction,
  });
};

export const securityConfig = loadSecurityConfig();
