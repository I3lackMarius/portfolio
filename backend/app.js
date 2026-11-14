import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import portfolioRoutes from './routes/portfolioRoutes.js';
import authRoutes from './routes/authRoutes.js';
import siteContentRoutes from './routes/siteContentRoutes.js';
import errorHandler from './middleware/error.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Portfolio API is running' });
});

app.use('/api/content', siteContentRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/auth', authRoutes);
app.use(errorHandler);

export default app;