import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/database.js';
import portfolioRoutes from './routes/portfolioRoutes.js';

// Initialize app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Portfolio API is running' });
});

// Portfolio routes
app.use('/api/portfolio', portfolioRoutes);

// Error handling middleware
import errorHandler from './middleware/error.js';
app.use(errorHandler);

export default app;