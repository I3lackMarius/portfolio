import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.js';

export const promoteAdmin = async ({
  email = process.env.ADMIN_EMAIL,
  connect = connectDB,
  disconnect = () => mongoose.disconnect(),
  UserModel = User,
} = {}) => {
  if (typeof email !== 'string' || !email.trim()) {
    throw new Error('ADMIN_EMAIL is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  await connect();

  try {
    const user = await UserModel.findOneAndUpdate(
      { email: new RegExp(`^${escapedEmail}$`, 'i') },
      { $set: { email: normalizedEmail, isAdmin: true } },
      { new: true, runValidators: true },
    ).select('_id');

    if (!user) {
      throw new Error('No existing user matches ADMIN_EMAIL');
    }

    return true;
  } catch (error) {
    const redactedMessage = error.message.replace(
      new RegExp(escapedEmail, 'ig'),
      '[redacted]',
    );
    throw new Error(redactedMessage, { cause: error });
  } finally {
    await disconnect();
  }
};

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  promoteAdmin()
    .then(() => {
      console.log('Admin access granted to the existing account.');
    })
    .catch((error) => {
      console.error('Admin promotion failed:', error.message);
      process.exitCode = 1;
    });
}
