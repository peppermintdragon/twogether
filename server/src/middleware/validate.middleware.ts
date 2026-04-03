import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { error } from '../utils/apiResponse.js';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        err.errors.forEach((e: { path: (string | number)[]; message: string }) => {
          const field = e.path.join('.');
          if (!fieldErrors[field]) fieldErrors[field] = [];
          fieldErrors[field].push(e.message);
        });
        return error(res, 'Validation failed', 400, fieldErrors);
      }
      next(err);
    }
  };
}
