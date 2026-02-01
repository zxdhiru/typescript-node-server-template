import { z, ZodError } from 'zod';
import { ValidationError } from './errors';

/**
 * Validate data against Zod schema and throw ValidationError on failure
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      throw new ValidationError('Validation failed', formattedErrors);
    }
    throw error;
  }
}

/**
 * Validate data and return result with success/error
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T }
  | { success: false; errors: Array<{ field: string; message: string }> } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return { success: false, errors: formattedErrors };
    }
    return { success: false, errors: [{ field: 'unknown', message: 'Validation failed' }] };
  }
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  /**
   * MongoDB ObjectId validation
   */
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),

  /**
   * Indian phone number validation
   */
  indianPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),

  /**
   * Email validation
   */
  email: z.string().email('Invalid email address').toLowerCase(),

  /**
   * Pagination query params
   */
  pagination: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 10)),
    sort: z.string().optional(),
  }),

  /**
   * Date validation (ISO 8601)
   */
  isoDate: z.string().datetime({ message: 'Invalid date format. Use ISO 8601' }),

  /**
   * Coordinates validation
   */
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
};
