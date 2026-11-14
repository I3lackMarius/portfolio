import app from '../backend/app.js';
import connectDB from '../backend/config/database.js';
import { createVercelHandler } from '../backend/vercelHandler.js';

export default createVercelHandler({ app, connectDB });
