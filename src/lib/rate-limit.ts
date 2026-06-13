import { cache } from '@/lib/cache';

/**
 * Fixed-window rate limiter (Module 10/11). Backed by the shared cache, so it
 * uses Redis in production and an in-memory window in development.
 * Default: 100 requests per IP per 60s.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
}

export async function rateLimit(
  identifier: string,
  limit = 100,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const current = (await cache.get<number>(key)) ?? 0;
  const next = current + 1;
  await cache.set(key, next, windowSeconds);
  return {
    allowed: next <= limit,
    remaining: Math.max(0, limit - next),
    limit,
    resetSeconds: windowSeconds,
  };
}

/** Extract a best-effort client IP from request headers. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
