import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../lib/errors';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new AppError(400, 'validation_error', `Validation failed: ${errorMessages}`));
      } else {
        next(error);
      }
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.query);
      Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true, enumerable: true });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new AppError(400, 'validation_error', `Query params validation failed: ${errorMessages}`));
      } else {
        next(error);
      }
    }
  };
};
