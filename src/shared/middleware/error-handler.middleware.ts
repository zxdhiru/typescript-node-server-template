import { Request, Response, NextFunction } from 'express';
import { AppError, isOperationalError } from '@/shared/utils/errors';
import { errorResponse } from '@/shared/utils/response.util';
import { env } from '@/config/env.config';
import { ZodError } from 'zod';
import { ValidationError } from '@/shared/utils/errors';

/**
 * Global error handling middleware
 * Must be last middleware in the chain
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  // Log error details
  console.error('Error occurred:', {
    correlationId: req.correlationId,
    error: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return errorResponse(
      res,
      new ValidationError('Validation failed', formattedErrors),
      req.correlationId
    );
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return errorResponse(res, new ValidationError(err.message), req.correlationId);
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return errorResponse(res, new ValidationError('Invalid ID format'), req.correlationId);
  }

  // Handle Mongoose duplicate key errors
  if (err.name === 'MongoServerError' && 'code' in err && err.code === 11000) {
    return errorResponse(res, new ValidationError('Resource already exists'), req.correlationId);
  }

  // Handle operational errors (expected)
  if (err instanceof AppError) {
    return errorResponse(res, err, req.correlationId);
  }

  // Handle unexpected errors
  if (!isOperationalError(err)) {
    // Log critical error for investigation
    console.error('CRITICAL - Non-operational error:', {
      correlationId: req.correlationId,
      error: err,
      stack: err.stack,
    });

    // Don't expose internal error details in production
    if (env.NODE_ENV === 'production') {
      return errorResponse(res, new AppError('An unexpected error occurred'), req.correlationId);
    }
  }

  return errorResponse(res, err, req.correlationId);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404));
};
