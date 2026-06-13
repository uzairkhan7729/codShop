import type { ApiFailure, ApiSuccess } from '@/lib/api';

/** Error thrown by the client fetcher, carrying the API error code + status. */
export class FetchError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Typed fetch wrapper for our API envelope. Unwraps { success, data } and
 * throws FetchError on { success: false } so TanStack Query surfaces it.
 */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  let json: ApiSuccess<T> | ApiFailure;
  try {
    json = await res.json();
  } catch {
    throw new FetchError('Unexpected server response', res.status, 'PARSE_ERROR');
  }

  if (!res.ok || json.success === false) {
    const err = (json as ApiFailure).error;
    throw new FetchError(err?.message ?? 'Request failed', res.status, err?.code ?? 'ERROR', err?.details);
  }
  return (json as ApiSuccess<T>).data;
}

export function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return apiFetch<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
}
export function apiPut<T>(url: string, body?: unknown): Promise<T> {
  return apiFetch<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
}
export function apiDelete<T>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE' });
}
