import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/app-error.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      if (err instanceof ZodError || err?.issues) {
        const issues = err.issues || err.errors || [];
        const details = issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError('Validation failed for request body', details));
      } else {
        next(err);
      }
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      for (const key of Object.keys(req.query)) {
        delete (req.query as any)[key];
      }
      Object.assign(req.query, parsed);
      (req as any).validatedQuery = parsed;
      next();
    } catch (err: any) {
      if (err instanceof ZodError || err?.issues) {
        const issues = err.issues || err.errors || [];
        const details = issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError('Validation failed for query parameters', details));
      } else {
        next(err);
      }
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.params);
      for (const key of Object.keys(req.params)) {
        delete (req.params as any)[key];
      }
      Object.assign(req.params, parsed);
      (req as any).validatedParams = parsed;
      next();
    } catch (err: any) {
      if (err instanceof ZodError || err?.issues) {
        const issues = err.issues || err.errors || [];
        const details = issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError('Validation failed for URL parameters', details));
      } else {
        next(err);
      }
    }
  };
}
