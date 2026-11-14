import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import portfolioRoutes from './routes/portfolioRoutes.js';
import authRoutes from './routes/authRoutes.js';
import siteContentRoutes from './routes/siteContentRoutes.js';
import lifeRoutes from './life/routes/lifeRoutes.js';
import createCsrfProtection from './middleware/csrf.js';
import errorHandler from './middleware/error.js';
import { securityConfig } from './config/security.js';

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, false);
    }

    if (!securityConfig.allowedOrigins.has(origin)) {
      const error = new Error('Request origin is not allowed');
      error.statusCode = 403;
      return callback(error);
    }

    return callback(null, origin);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
};

const csrfProtection = createCsrfProtection({
  allowedOrigins: securityConfig.allowedOrigins,
});

app.set('trust proxy', process.env.VERCEL === '1' ? 1 : false);
app.use(helmet());
app.use(cors(corsOptions));
morgan.token('safe-path', (req) => req.path);
app.use(morgan(':method :safe-path :status :response-time ms'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  return next();
});
app.use('/api', csrfProtection);

app.get('/', (req, res) => {
  res.json({ message: 'Portfolio API is running' });
});

app.use('/api/content', siteContentRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/life/v1', lifeRoutes);
app.use(errorHandler);

export default app;