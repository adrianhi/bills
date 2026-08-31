import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';
import { AppError } from '../errors/app-error';
import { logger } from '../shared/observability/logger';

export function errorHandler(
  err: unknown,
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

  if (
    err instanceof Error
    && err.name === 'PrismaClientKnownRequestError'
    && 'code' in err
  ) {
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
    logger.error('request_failed', {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      errorCode: err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR',
      errorName: err instanceof Error ? err.name : 'UnknownError',
    });
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message =
    err instanceof AppError
      ? err.message
      : statusCode >= 500
        ? 'An unexpected error occurred.'
        : err instanceof Error
          ? err.message || 'Request failed.'
          : 'Request failed.';
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
