import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const publicUser = (user) => ({
  _id: String(user._id),
  name: user.name,
  email: user.email,
  isAdmin: Boolean(user.isAdmin),
});

export const createAuthController = ({
  UserModel = User,
  signToken = (userId) => {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required for authentication');
    }

    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
  },
} = {}) => ({
  login: async (req, res, next) => {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
      const user = await UserModel.findOne({
        email: email.trim().toLowerCase(),
      }).select('+password');

      if (!user || !(await user.matchPassword(password))) {
        return res
          .status(401)
          .json({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      }

      return res.json({
        ...publicUser(user),
        token: signToken(user._id),
      });
    } catch (error) {
      return next(error);
    }
  },
  register: (_req, res) =>
    res.status(403).json({ message: 'Public registration is disabled' }),
  currentUser: (req, res) => res.json(publicUser(req.user)),
  privateArea: (req, res) =>
    res.json({
      message: 'Private area access granted',
      user: { name: req.user.name },
    }),
});
