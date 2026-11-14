import User from '../models/User.js';
import Session from '../models/Session.js';
import LoginAttempt from '../models/LoginAttempt.js';
import {
  clearAccountLoginAttempts,
} from '../middleware/loginRateLimit.js';
import {
  clearCsrfCookie,
  clearSessionCookie,
  createCsrfToken,
  createSessionToken,
  hashSessionToken,
  readCookie,
  sessionCookieName,
  setCsrfCookie,
  setSessionCookie,
} from '../security/session.js';
import { securityConfig } from '../config/security.js';

const publicUser = (user) => ({
  _id: String(user._id),
  name: user.name,
  email: user.email,
  isAdmin: Boolean(user.isAdmin),
});

const validEmail = (email) =>
  email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const createAuthController = ({
  UserModel = User,
  SessionModel = Session,
  LoginAttemptModel = LoginAttempt,
  now = () => new Date(),
  createToken = createSessionToken,
  sessionMaxAgeMs = securityConfig.sessionMaxAgeMs,
  isProduction = securityConfig.isProduction,
} = {}) => ({
  csrfToken: (req, res) => {
    const token = createCsrfToken();
    setCsrfCookie(res, token, sessionMaxAgeMs, isProduction);
    res.set('Cache-Control', 'no-store');
    return res.json({ csrfToken: token });
  },

  login: async (req, res, next) => {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const password = req.body?.password;

    if (!validEmail(email) || typeof password !== 'string' || !password || password.length > 1024) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_LOGIN_INPUT',
        message: 'A valid email and password are required',
      });
    }

    try {
      const user = await UserModel.findOne({ email }).select('+password');
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials',
        });
      }

      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + sessionMaxAgeMs);
      const sessionToken = createToken();
      const previousToken = readCookie(
        req,
        sessionCookieName(isProduction),
      );

      if (previousToken) {
        await SessionModel.updateOne(
          { tokenHash: hashSessionToken(previousToken), revokedAt: null },
          { $set: { revokedAt: createdAt } },
        );
      }

      await SessionModel.create({
        tokenHash: hashSessionToken(sessionToken),
        userId: user._id,
        createdAt,
        expiresAt,
      });
      await clearAccountLoginAttempts(
        LoginAttemptModel,
        req.loginAttempt?.accountKey,
      );
      setSessionCookie(res, sessionToken, sessionMaxAgeMs, isProduction);
      res.set('Cache-Control', 'no-store');
      return res.json(publicUser(user));
    } catch (error) {
      return next(error);
    }
  },

  register: (_req, res) =>
    res.status(403).json({
      success: false,
      message: 'Public registration is disabled',
    }),

  currentUser: (req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.json(publicUser(req.user));
  },

  privateArea: (req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.json({
      message: 'Private area access granted',
      user: { name: req.user.name },
    });
  },

  logout: async (req, res, next) => {
    const token = readCookie(req, sessionCookieName(isProduction));

    try {
      if (token) {
        await SessionModel.updateOne(
          { tokenHash: hashSessionToken(token), revokedAt: null },
          { $set: { revokedAt: now() } },
        );
      }

      clearSessionCookie(res, isProduction);
      clearCsrfCookie(res, isProduction);
      res.set('Cache-Control', 'no-store');
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  },
});
