import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing from environment variables');
  }

  if (!connectionPromise || mongoose.connection.readyState === 0) {
    connectionPromise = mongoose
      .connect(uri)
      .then((connection) => {
        console.log(`MongoDB connected on host: ${connection.connection.host}`);
        return connection.connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
};

export default connectDB;