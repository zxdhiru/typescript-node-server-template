import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// JWT Duration type
type JwtDuration = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y'}`;

const jwtDurationSchema = z.custom<JwtDuration>(
  (val) => typeof val === 'string' && /^[0-9]+[smhdwMy]$/.test(val),
  { message: 'Invalid JWT duration format' }
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_VERSION: z.string().default('v1'),

  // Database
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  MONGO_OPTIONS: z.string().optional(),

  // JWT
  JWT_ACCESS_TOKEN_SECRET: z.string().min(32, 'JWT_ACCESS_TOKEN_SECRET is required'),
  JWR_REFRESH_TOKEN_SECRET: z.string().min(32, 'JWR_REFRESH_TOKEN_SECRET is required'),

  // JWT EXPIRY
  JWT_ACCESS_TOKEN_EXPIRES_IN: jwtDurationSchema.default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: jwtDurationSchema.default('7d'),

  // OTP
  OTP_EXPIRES_IN_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),
  OTP_LENGTH: z.coerce.number().default(6),

  // COMMUNICATION
  EMAIL_PROVIDER: z.enum(['mock', 'smtp']).default('mock'),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_SENDER_ADDRESS: z.string().email().optional(),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  ALLOWED_ORIGINS: z
    .string()
    .transform((val) => val.split(','))
    .default(['http://localhost:3000', 'http://localhost:3001']),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100), // limit each IP to 100 requests per windowMs

  // Audit Logging
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().default(365),
});

type EnvConfig = z.infer<typeof envSchema>;

// validate environment variables

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
