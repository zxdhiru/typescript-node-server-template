import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// JWT duration type
type JWTDuration = `${number}${'s' | 'm' | 'h' | 'd'}`;

const jwtDurationSchema = z.custom<JWTDuration>(
  (val) => typeof val === 'string' && /^\d+[smhd]$/.test(val),
  { message: 'Invalid JWT duration format (use 15m, 1h, 7d)' }
);

/**
 * Environment variables schema with validation
 * Ensures all required configuration is present at startup
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(5000),
  API_VERSION: z.string().default('v1'),

  // Database
  MONGODB_URI: z.string().url(),
  MONGODB_OPTIONS: z.string().optional(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT access secret must be at least 32 characters'),

  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),

  // JWT Expiry
  JWT_ACCESS_EXPIRY: jwtDurationSchema,
  JWT_REFRESH_EXPIRY: jwtDurationSchema,

  // OTP
  OTP_EXPIRY_MINUTES: z.string().transform(Number).default(10),
  OTP_MAX_ATTEMPTS: z.string().transform(Number).default(3),
  OTP_LENGTH: z.string().transform(Number).default(6),

  // Communication
  EMAIL_PROVIDER: z.string().default('mock'),
  EMAIL_FROM: z.string().email(),
  EMAIL_API_KEY: z.string().optional(),

  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default(12),
  ALLOWED_ORIGINS: z.string().transform((val) => val.split(',')),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(100),

  // Audit
  AUDIT_LOG_RETENTION_DAYS: z.string().transform(Number).default(365),
});

type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates and exports environment configuration
 * Throws error if validation fails, ensuring safe startup
 */
const validateEnv = (): EnvConfig => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e) => e.path.join('.')).join(', ');
      throw new Error(`Environment validation failed: ${missingVars}`);
    }
    throw error;
  }
};

export const env = validateEnv();
