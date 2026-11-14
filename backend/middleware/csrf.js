import { readCookie, timingSafeStringEqual } from '../security/session.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const createCsrfProtection = ({
  allowedOrigins,
  csrfCookieName = 'portfolio_csrf',
} = {}) => (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.get?.('origin') ?? req.headers?.origin;
  if (!origin || !allowedOrigins?.has(origin)) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_ORIGIN_FORBIDDEN',
      error: 'Request origin is not allowed',
    });
  }

  const cookieToken = readCookie(req, csrfCookieName);
  const headerToken = req.get?.('x-csrf-token') ?? req.headers?.['x-csrf-token'];
  if (!timingSafeStringEqual(cookieToken, headerToken)) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_TOKEN_INVALID',
      error: 'A valid CSRF token is required',
    });
  }

  return next();
};

export default createCsrfProtection;
