import { z } from 'zod';

/**
 * Environment variable validation (Module 11).
 * Parsed once at module load. Client-safe vars (NEXT_PUBLIC_*) are validated
 * separately so they can be referenced from the browser bundle.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16, 'NEXTAUTH_SECRET must be >= 16 chars'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  REDIS_URL: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('Noon Commerce <no-reply@example.com>'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const clientSchema = z.object({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_APP_URL: z.string().optional().default('http://localhost:3000'),
});

function formatErrors(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
}

// During `next build` on a fresh checkout some secrets may be absent; only hard-fail
// at runtime on the server. We still surface a readable message.
function parseServer() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = `❌ Invalid server environment variables:\n${formatErrors(parsed.error)}`;
    if (process.env.NODE_ENV === 'production') throw new Error(message);
    // eslint-disable-next-line no-console
    console.warn(message);
    return serverSchema.parse({
      ...process.env,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'dev-insecure-secret-change-me',
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'dev-insecure-secret-change-me',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'dev-insecure-secret-change-me',
      DATABASE_URL: process.env.DATABASE_URL ?? 'mongodb://localhost:27017/ecommerce?replicaSet=rs0',
    });
  }
  return parsed.data;
}

export const env = {
  ...parseServer(),
  ...clientSchema.parse({
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  }),
};

export type Env = typeof env;
