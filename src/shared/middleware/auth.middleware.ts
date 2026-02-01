import { Request, Response, NextFunction } from 'express';
import { jwtService } from '@/infrastructure/services/auth/jwt.service';
import { AuthenticationError, AuthorizationError } from '@/shared/utils/errors';
import { UserRole } from '@/shared/constants';
import { IDecodedToken } from '@/shared/types/auth.types';

/**
 * Extended Express Request with authenticated user
 */
declare global {
  namespace Express {
    interface Request {
      user?: IDecodedToken;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;

    const token = req.cookies?.accessToken || bearer;

    if (!token) {
      throw new AuthenticationError('No access token provided');
    }

    // Verify token
    const decoded = jwtService.verifyAccessToken(token);

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware factory
 * Checks if authenticated user has required role(s)
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Not authenticated');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError(
          `Access forbidden. Required roles: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't fail if missing
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwtService.verifyAccessToken(token);
      req.user = decoded;
    }
    next();
  } catch {
    // Ignore errors, continue without user
    next();
  }
};
