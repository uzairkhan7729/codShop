import { loadStripe, type Stripe } from '@stripe/stripe-js';

/**
 * Browser Stripe.js singleton (Module 9). Resolves to null when the publishable
 * key is absent, so the checkout can show a friendly "payments unavailable"
 * message instead of crashing.
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return Promise.resolve(null);
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}
