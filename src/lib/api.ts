import { NextResponse } from 'next/server';
import { ZodError, type z, type ZodTypeAny } from 'zod';
import { AppError } from '@/lib/errors';

/** True for AppError instances (or anything matching its operational shape). */
function isOperationalError(
  error: unknown,
): error is { message: string; statusCode: number; code: string } {
  if (error instanceof AppError) return true;
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { isOperational?: unknown }).isOperational === true &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number' &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

/** Standard API envelope. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}
export interface ApiFailure {
  success: false;
  error: { message: string; code: string; details?: unknown };
}

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status: number, code: string, details?: unknown) {
  return NextResponse.json<ApiFailure>(
    { success: false, error: { message, code, details } },
    { status },
  );
}

/**
 * Centralized error → HTTP mapping (Module 12). Operational AppErrors map to
 * their status code; ZodErrors → 400; anything else → 500 (logged).
 */
export function handleError(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof ZodError) {
    return fail('Validation failed', 400, 'VALIDATION_ERROR', error.flatten().fieldErrors);
  }
  // Detect operational errors by shape, not just `instanceof` — across module
  // boundaries / hot-reloads the AppError class identity can differ, which would
  // otherwise turn a clean 400 into a misleading 500.
  if (isOperationalError(error)) {
    return fail(error.message, error.statusCode, error.code);
  }
  // eslint-disable-next-line no-console
  console.error('[api] unhandled error:', error);
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again.'
      : error instanceof Error
        ? error.message
        : 'Unknown error';
  return fail(message, 500, 'INTERNAL_ERROR');
}

/** Wrap a route handler so thrown errors become consistent JSON responses. */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

/** Parse + validate a JSON request body, throwing ZodError on failure. */
export async function parseBody<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    json = {};
  }
  return schema.parse(json);
}

/** Parse + validate URL search params. */
export function parseQuery<S extends ZodTypeAny>(request: Request, schema: S): z.infer<S> {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  return schema.parse(params);
}
