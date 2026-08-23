import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';
import { AppError } from '../errors/app-error';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  void req;
  void next;
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid data.',
        requestId: req.requestId,
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          code: 'RESOURCE_CONFLICT',
          message: 'A record with this unique identifier already exists.',
          requestId: req.requestId,
        },
      });
      return;
    }
  }

  if (config.nodeEnv !== 'test') {
    console.error('💥 Server Error:', err);
  }

  const statusCode = err instanceof AppError ? err.statusCode : err.status || err.statusCode || 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message =
    err instanceof AppError
      ? err.message
      : statusCode >= 500
        ? 'An unexpected error occurred.'
        : err.message || 'Request failed.';
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId: req.requestId,
      ...(err instanceof AppError && err.details ? { details: err.details } : {}),
    },
  });
}
