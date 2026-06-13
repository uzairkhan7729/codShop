import { ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Health check for Render. */
export async function GET() {
  return ok({ status: 'ok', timestamp: new Date().toISOString() });
}
