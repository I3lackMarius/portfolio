import User from '../models/User.js';
import Session from '../models/Session.js';
import {
  hashSessionToken,
  readCookie,
  sessionCookieName,
} from '../security/session.js';
import { securityConfig } from '../config/security.js';

const unauthorized = (res) =>
  res.status(401).json({ success: false, message: 'Not authorized' });

export const createProtect = ({
  UserModel = User,
  SessionModel = Session,
  now = () => new Date(),
  isProduction = securityConfig.isProduction,
} = {}) => async (req, res, next) => {
  const token = readCookie(req, sessionCookieName(isProduction));
  if (!token) {
    return unauthorized(res);
  }

  try {
    const session = await SessionModel.findOne({
      tokenHash: hashSessionToken(token),
    });
    const currentTime = now();

    if (
      !session ||
      session.revokedAt ||
      !session.expiresAt ||
      new Date(session.expiresAt).getTime() <= currentTime.getTime()
    ) {
      return unauthorized(res);
    }

    const user = await UserModel.findById(session.userId).select('-password');
    if (!user) {
      await SessionModel.updateOne(
        { _id: session._id, revokedAt: null },
        { $set: { revokedAt: currentTime } },
      );
      return unauthorized(res);
    }

    req.session = session;
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const protect = createProtect();

export const adminOnly = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  return next();
};
