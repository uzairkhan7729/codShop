import { handleError } from '@/lib/api';
import { paymentGateway } from '@/server/payments';
import { services } from '@/server/services';

// Stripe needs the raw body for signature verification — never parse it first.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST /api/webhooks/stripe — verify signature, normalize, apply to order state. */
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature' }), { status: 400 });
  }

  let event;
  try {
    const rawBody = await request.text();
    event = paymentGateway.handleWebhook(rawBody, signature);
  } catch (error) {
    // Signature failure → 400 so Stripe does not retry a forged/garbled event.
    return handleError(error);
  }

  try {
    await services.payments.applyWebhookEvent(event);
  } catch (error) {
    // Processing failure → 500 so Stripe retries (idempotency in applyWebhookEvent).
    // eslint-disable-next-line no-console
    console.error('[webhook] processing failed:', error);
    return new Response(JSON.stringify({ received: true, processed: false }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
