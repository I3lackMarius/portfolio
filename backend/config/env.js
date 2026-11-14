import dotenv from 'dotenv';

// Load environment variables from .env file
if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

export default {
  MONGODB_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT || 5000,
  APP_ORIGINS: process.env.APP_ORIGINS,
  SESSION_MAX_AGE_MS: process.env.SESSION_MAX_AGE_MS,
  LOGIN_RATE_LIMIT_SECRET: process.env.LOGIN_RATE_LIMIT_SECRET,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
};