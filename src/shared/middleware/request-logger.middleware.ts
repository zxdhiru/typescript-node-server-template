import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Install uuid package
// npm install uuid @types/uuid

/**
 * Extended Express Request with correlation ID
 */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

/**
 * Request logging middleware
 * Adds correlation ID and logs request/response details
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Generate correlation ID
  req.correlationId = uuidv4();
  req.startTime = Date.now();

  // Set correlation ID header
  res.setHeader('X-Correlation-ID', req.correlationId);

  // Log incoming request
  console.log(`[${req.correlationId}] ${req.method} ${req.path} - Started`);

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    const logLevel = res.statusCode >= 400 ? 'error' : 'log';

    console[logLevel](
      `[${req.correlationId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'token', 'otp', 'apiKey', 'secret'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
}
