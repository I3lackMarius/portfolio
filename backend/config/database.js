import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing from environment variables');
  }

  const connection = await mongoose.connect(uri);
  console.log(`MongoDB connected on host: ${connection.connection.host}`);
  return connection.connection;
};

export default connectDB;