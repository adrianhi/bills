import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/error.middleware';

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

  // Security and utilities middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows embedded dashboard scripts/styles
    })
  );
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
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
  app.use(express.static(publicDir));

  // Mount API routes
  app.use('/api', apiRoutes);

  // Fallback for frontend SPA routes
  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
