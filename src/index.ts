import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { startScheduler } from './jobs/scheduler';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

import { registry } from './providers/registry';
import { YouTubeProvider } from './providers/youtube';
import { AutomatedResolver } from './providers/automated';

registry.registerContentProvider(new YouTubeProvider(config.youtube.apiKey));
registry.setResolver(new AutomatedResolver());

import contentRoutes from './routes/content';
import marketRoutes from './routes/markets';
import bettingRoutes from './routes/betting';
import feedRoutes from './routes/feed';
import userRoutes from './routes/users';
import walletRoutes from './routes/wallet';
import confirmRoutes from './routes/confirm';
import submitRoutes from './routes/submit';
import demoRoutes from './routes/demo';

const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Structured request logging
app.use(pinoHttp({ logger }));

// Compress responses
app.use(compression());

// CORS — restrict to configured origin in production
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing — limit payload size
app.use(express.json({ limit: '64kb' }));

// Global rate limit: 100 req/min per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests, please slow down.' },
});
app.use(limiter);

// Strict limit for write endpoints
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests, please slow down.' },
});
app.use('/api/content/submit', writeLimiter);
app.use('/api/markets/:id/bet', writeLimiter);
app.use('/api/wallet/create', writeLimiter);

// Health check — before auth/rate limit so load balancers can reach it freely
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

app.use('/api/content', contentRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/markets', bettingRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/confirm', confirmRoutes);
app.use('/api/submit', submitRoutes);
if (process.env.NODE_ENV !== 'production') app.use('/api/demo', demoRoutes);

app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: process.env.NODE_ENV }, 'Server started');
  startScheduler();
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  });
  // Force exit after 10s if connections don't drain
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
