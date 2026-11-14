import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import LoginAttempt from '../models/LoginAttempt.js';
import { securityConfig } from '../config/security.js';

const WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_LIMIT = 5;
const NETWORK_LIMIT = 30;

const makeKey = (secret, type, value, bucketStart) =>
  createHmac('sha256', secret)
    .update(`${type}:${value}:${bucketStart}`)
    .digest('hex');

const networkPrefix = (ip) => {
  // Aggregate per /24 or /64 so address rotation within a subnet does not bypass limits.
  const mappedIpv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  const address = mappedIpv4?.[1] || ip;

  if (isIP(address) === 4) {
    return `${address.split('.').slice(0, 3).join('.')}.0/24`;
  }
  if (isIP(address) !== 6) {
    return 'unknown';
  }

  let canonical;
  try {
    canonical = new URL(`http://[${address}]/`).hostname
      .slice(1, -1)
      .toLowerCase();
  } catch {
    return 'unknown';
  }
  const [left = '', right = ''] = canonical.split('::');
  const leftGroups = left ? left.split(':') : [];
  const rightGroups = right ? right.split(':') : [];
  const zeroGroups = Array(8 - leftGroups.length - rightGroups.length).fill('0');
  return [...leftGroups, ...zeroGroups, ...rightGroups]
    .slice(0, 4)
    .join(':') + '/64';
};

const incrementBucket = async (Model, key, expiresAt) => {
  try {
    return await Model.findOneAndUpdate(
      { key },
      {
        $inc: { attempts: 1 },
        $setOnInsert: { expiresAt },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    return Model.findOneAndUpdate(
      { key },
      { $inc: { attempts: 1 } },
      { new: true },
    );
  }
};

export const createLoginRateLimit = ({
  LoginAttemptModel = LoginAttempt,
  secret = securityConfig.loginRateLimitSecret,
  now = () => Date.now(),
  windowMs = WINDOW_MS,
  accountLimit = ACCOUNT_LIMIT,
  networkLimit = NETWORK_LIMIT,
} = {}) => async (req, res, next) => {
  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase().slice(0, 254)
      : '';
  const clientIp = networkPrefix(
    req.ip || req.socket?.remoteAddress || 'unknown',
  );
  const time = now();
  const bucketStart = Math.floor(time / windowMs) * windowMs;
  const expiresAt = new Date(bucketStart + windowMs);
  const accountKey = email
    ? makeKey(secret, 'account', email, bucketStart)
    : undefined;
  const networkKey = makeKey(secret, 'network', clientIp, bucketStart);

  try {
    const buckets = await Promise.all([
      ...(accountKey
        ? [incrementBucket(LoginAttemptModel, accountKey, expiresAt)]
        : []),
      incrementBucket(LoginAttemptModel, networkKey, expiresAt),
    ]);
    const accountBucket = accountKey ? buckets[0] : undefined;
    const networkBucket = buckets[buckets.length - 1];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucketStart + windowMs - time) / 1000),
    );

    if (
      (accountBucket && accountBucket.attempts > accountLimit) ||
      networkBucket.attempts > networkLimit
    ) {
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        code: 'LOGIN_RATE_LIMITED',
        message: 'Too many login attempts. Please try again later.',
      });
    }

    req.loginAttempt = { accountKey, networkKey };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const clearAccountLoginAttempts = async (LoginAttemptModel, key) => {
  if (key) {
    await LoginAttemptModel.deleteOne({ key });
  }
};

export const loginRateLimit = createLoginRateLimit();
