import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '@/shared/utils/errors';
import { env } from '@/config/env.config';

/**
 * In-memory rate limiter
 * For production, use Redis for distributed rate limiting
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if request should be rate limited
   */
  public isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return false;
    }

    if (record.count >= maxRequests) {
      return true;
    }

    record.count++;
    return false;
  }

  /**
   * Get remaining requests for a key
   */
  public getRemaining(key: string, maxRequests: number): number {
    const record = this.store.get(key);
    if (!record || Date.now() > record.resetTime) {
      return maxRequests;
    }
    return Math.max(0, maxRequests - record.count);
  }

  /**
   * Get reset time for a key
   */
  public getResetTime(key: string): number | null {
    const record = this.store.get(key);
    if (!record || Date.now() > record.resetTime) {
      return null;
    }
    return record.resetTime;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all rate limit data (for testing)
   */
  public clear(): void {
    this.store.clear();
  }

  /**
   * Destroy the rate limiter
   */
  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware
 */
export const rateLimit = (options?: {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}) => {
  const maxRequests = options?.maxRequests || env.RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options?.windowMs || env.RATE_LIMIT_WINDOW_MS;
  const keyGenerator = options?.keyGenerator || ((req: Request) => req.ip || 'unknown');
  const skip = options?.skip || (() => false);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip rate limiting if condition met
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const isLimited = rateLimiter.isRateLimited(key, maxRequests, windowMs);

    // Set rate limit headers
    const remaining = rateLimiter.getRemaining(key, maxRequests);
    const resetTime = rateLimiter.getResetTime(key);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    if (resetTime) {
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
    }

    if (isLimited) {
      return next(
        new RateLimitError(
          `Too many requests. Please try again after ${Math.ceil(windowMs / 1000)} seconds.`
        )
      );
    }

    next();
  };
};

/**
 * Strict rate limiting for sensitive operations (OTP, login)
 */
export const strictRateLimit = rateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

/**
 * Export rate limiter instance for testing
 */
export { rateLimiter };
