import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.errorCode,
      message: err.message,
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected error occurred',
  });
}
