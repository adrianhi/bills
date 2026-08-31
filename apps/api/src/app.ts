import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';
import { config } from './config';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { appContainer } from './app-container';
import { logger } from './shared/observability/logger';

function resolvePublicDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), '../public'),
    path.resolve(process.cwd(), '../../public'),
    path.resolve(__dirname, '../public'),
    path.resolve(__dirname, '../../public'),
    path.resolve('/app/public'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  return path.resolve(process.cwd(), 'public');
}

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req: Request, res: Response, next) => {
    const incoming = req.headers['x-request-id'];
    req.requestId = typeof incoming === 'string' && incoming.length <= 100 ? incoming : crypto.randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  });

  // Security and utilities middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'https://*.supabase.co'],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.nodeEnv !== 'production' || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin is not allowed by CORS'));
      },
      credentials: true,
    })
  );
  app.post(
    '/api/v1/webhooks/google/gmail',
    express.json({ limit: '256kb' }),
    appContainer.gmailPubSubController.handle
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: config.nodeEnv === 'test' ? 10_000 : 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else if (config.nodeEnv !== 'test') {
    app.use((req: Request, res: Response, next) => {
      const startedAt = Date.now();
      res.on('finish', () => {
        logger.info('http_request_completed', {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        });
      });
      next();
    });
  }

  // Health checks
  app.get(['/health', '/api/v1/health'], (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
    });
  });

  // Serve Web UI Dashboard
  const publicDir = resolvePublicDir();
  app.use(express.static(publicDir, {
    etag: true,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));

  // Mount API routes
  app.use('/api', apiRoutes);

  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: 'API route not found.', requestId: req.requestId },
    });
  });

  // Fallback for frontend SPA routes
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
