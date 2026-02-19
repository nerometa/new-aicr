import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid libsql URL'),
  DATABASE_AUTH_TOKEN: z.string().min(1, 'DATABASE_AUTH_TOKEN is required'),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),

  // Klap API
  KLAP_API_KEY: z.string().min(1, 'KLAP_API_KEY is required'),
  KLAP_API_URL: z.string().url().default('https://api.klap.video/v2'),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),

  // Frontend
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),

  // Server
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // Optional: Klap configuration
  KLAP_MAX_DURATION: z.coerce.number().int().min(10).max(120).default(30),
  KLAP_MAX_CLIP_COUNT: z.coerce.number().int().min(1).max(10).default(3),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
