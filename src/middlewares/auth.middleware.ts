import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey =
    req.headers['x-api-key'] ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
    req.query.api_key;

  if (!apiKey || apiKey !== config.apiKey) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or missing API key in x-api-key header or Bearer token',
    });
    return;
  }

  next();
}

/**
 * Optional API key for read endpoints or dashboard
 */
export function optionalApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey =
    req.headers['x-api-key'] ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
    req.query.api_key;

  if (apiKey && apiKey === config.apiKey) {
    (req as any).isAuthenticated = true;
  }
  next();
}
