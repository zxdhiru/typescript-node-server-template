import { UserRole } from '@/shared/constants';

/**
 * JWT payload structure
 */
export interface IJWTPayload {
  userId: string;
  role: UserRole;
  sessionId?: string;
}

/**
 * Token pair (access + refresh)
 */
export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Decoded token data
 */
export interface IDecodedToken extends IJWTPayload {
  iat: number; // issued at
  exp: number; // expiration
}
