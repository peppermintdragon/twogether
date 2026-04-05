import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { createRateLimiter } from './middleware/rateLimiter.middleware.js';
import routes from './routes/index.js';

const app = express();

// Security
app.use(helmet());

const allowedOrigins = [
  env.CLIENT_URL,
  'https://twogetherclient-production.up.railway.app',
].filter(Boolean);

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any localhost port in development
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Allow configured and known production origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

// Rate limiting
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 200 }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
