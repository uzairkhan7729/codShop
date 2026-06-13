/**
 * Central pricing rules (tax, shipping). Kept in one place so the storefront,
 * cart, and order services all agree on totals.
 */
export const PRICING = {
  currency: 'AED',
  /** VAT rate applied to the discounted subtotal. */
  taxRate: 0.05,
  /** Flat shipping fee below the free-shipping threshold. */
  shippingFlatRate: 15,
  freeShippingThreshold: 200,
} as const;

export interface PriceBreakdown {
  subtotal: number;
  discount: number;
  taxableBase: number;
  tax: number;
  shippingCost: number;
  total: number;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute a full price breakdown from a subtotal and an already-resolved
 * discount amount. Tax is applied to the post-discount base; shipping is free
 * above the threshold.
 */
export function calculatePricing(
  subtotal: number,
  discount: number,
  shippingMethod: 'STANDARD' | 'EXPRESS' = 'STANDARD',
): PriceBreakdown {
  const safeSubtotal = round(Math.max(subtotal, 0));
  const safeDiscount = round(Math.min(Math.max(discount, 0), safeSubtotal));
  const taxableBase = round(safeSubtotal - safeDiscount);
  const tax = round(taxableBase * PRICING.taxRate);

  let shippingCost = 0;
  if (taxableBase > 0 && taxableBase < PRICING.freeShippingThreshold) {
    shippingCost = PRICING.shippingFlatRate;
  }
  if (shippingMethod === 'EXPRESS') {
    shippingCost += 25;
  }

  const total = round(taxableBase + tax + shippingCost);
  return { subtotal: safeSubtotal, discount: safeDiscount, taxableBase, tax, shippingCost, total };
}
