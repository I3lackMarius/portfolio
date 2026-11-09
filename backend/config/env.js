import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  PORT: process.env.PORT || 5000,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
};