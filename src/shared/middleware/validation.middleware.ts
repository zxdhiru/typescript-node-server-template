import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { validateSchema } from '@/shared/utils/validation.util';
import { sanitizeObject } from '@/shared/utils/sanitization.util';

export type ValidationSchema = {
  body?: ZodType<unknown>;
  params?: ZodType<unknown>;
  query?: ZodType<unknown>;
};

/**
 * Validation middleware factory
 * Validates request body, query, or params against a Zod schema
 * Attaches validated data to req.validated
 */
export const validate = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.validated = {};

      // Body
      if (schema.body) {
        if (req.body === undefined || req.body === null) {
          throw new Error('Request body is required');
        }

        const sanitized = sanitizeObject(req.body);
        req.validated.body = validateSchema(schema.body, sanitized);
      }

      // Query
      if (schema.query) {
        req.validated.query = validateSchema(schema.query, req.query);
      }

      // Params
      if (schema.params) {
        req.validated.params = validateSchema(schema.params, req.params);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
