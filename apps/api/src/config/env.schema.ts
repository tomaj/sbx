import { z } from 'zod';

export const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().optional(),

  // Database
  DATABASE_URL: z.string().url().default('postgresql://localhost:5432/sbx'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  PREVIEW_TOKEN_SECRET: z.string().min(32).optional(),

  // Admin URL (used for links in emails and plugin HTML patching)
  ADMIN_URL: z.string().url().default('http://localhost:3001'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // MinIO / S3
  MINIO_ENDPOINT: z.string().url().default('http://localhost:9090'),
  MINIO_REGION: z.string().default('us-east-1'),
  MINIO_ACCESS_KEY: z.string().min(1, 'MINIO_ACCESS_KEY is required'),
  MINIO_SECRET_KEY: z.string().min(1, 'MINIO_SECRET_KEY is required'),
  MINIO_BUCKET: z.string().default('assets'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables at startup.
 * Throws with a clear error listing all missing/invalid vars.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((i: z.core.$ZodIssue) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`\n❌ Invalid environment variables:\n${errors}\n`);
  }
  return result.data;
}
