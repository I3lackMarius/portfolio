import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const createSessionToken = () => randomBytes(32).toString('base64url');

export const hashSessionToken = (token) =>
  createHash('sha256').update(token).digest('hex');

export const createCsrfToken = () => randomBytes(32).toString('base64url');

export const readCookie = (req, name) => {
  const cookieHeader = req.headers?.cookie;
  if (typeof cookieHeader !== 'string') {
    return undefined;
  }

  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) {
      continue;
    }

    return cookie.slice(separator + 1).trim();
  }

  return undefined;
};

export const timingSafeStringEqual = (left, right) => {
  if (
    typeof left !== 'string' ||
    typeof right !== 'string' ||
    left.length !== 43 ||
    right.length !== 43 ||
    !/^[A-Za-z0-9_-]+$/.test(left) ||
    !/^[A-Za-z0-9_-]+$/.test(right)
  ) {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

export const sessionCookieName = (isProduction) =>
  isProduction ? '__Host-portfolio_session' : 'portfolio_session';

const serializeCookie = (name, value, { path, maxAge, httpOnly, secure }) => {
  const attributes = [
    `${name}=${value}`,
    `Path=${path}`,
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];

  if (httpOnly) {
    attributes.push('HttpOnly');
  }
  if (secure) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
};

export const setSessionCookie = (res, token, maxAgeMs, isProduction) => {
  res.append(
    'Set-Cookie',
    serializeCookie(sessionCookieName(isProduction), token, {
      path: '/',
      maxAge: Math.floor(maxAgeMs / 1000),
      httpOnly: true,
      secure: isProduction,
    }),
  );
};

export const clearSessionCookie = (res, isProduction) => {
  res.append(
    'Set-Cookie',
    serializeCookie(sessionCookieName(isProduction), '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: isProduction,
    }) + '; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  );
};

export const setCsrfCookie = (res, token, maxAgeMs, isProduction) => {
  res.append(
    'Set-Cookie',
    serializeCookie('portfolio_csrf', token, {
      path: '/api',
      maxAge: Math.floor(maxAgeMs / 1000),
      httpOnly: false,
      secure: isProduction,
    }),
  );
};

export const clearCsrfCookie = (res, isProduction) => {
  res.append(
    'Set-Cookie',
    serializeCookie('portfolio_csrf', '', {
      path: '/api',
      maxAge: 0,
      httpOnly: false,
      secure: isProduction,
    }) + '; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  );
};
