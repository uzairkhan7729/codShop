import type { Coupon } from '@prisma/client';
import { CouponType } from '@prisma/client';

/**
 * Discount strategy abstraction (Liskov Substitution).
 * Every strategy honours the same contract — given a coupon and a subtotal it
 * returns the discount amount (never negative, never more than the subtotal).
 * Callers can swap strategies freely without behavioural surprises.
 */
export interface IDiscountStrategy {
  /** Returns the discount amount in major currency units. */
  calculate(coupon: Coupon, subtotal: number): number;
}

/** Clamp a discount so it is within [0, subtotal] and rounded to 2 decimals. */
function clamp(amount: number, subtotal: number): number {
  const bounded = Math.min(Math.max(amount, 0), subtotal);
  return Math.round(bounded * 100) / 100;
}

export class PercentageDiscountStrategy implements IDiscountStrategy {
  calculate(coupon: Coupon, subtotal: number): number {
    const raw = (subtotal * coupon.value) / 100;
    const capped = coupon.maxDiscount != null ? Math.min(raw, coupon.maxDiscount) : raw;
    return clamp(capped, subtotal);
  }
}

export class FixedDiscountStrategy implements IDiscountStrategy {
  calculate(coupon: Coupon, subtotal: number): number {
    return clamp(coupon.value, subtotal);
  }
}

const strategies: Record<CouponType, IDiscountStrategy> = {
  [CouponType.PERCENTAGE]: new PercentageDiscountStrategy(),
  [CouponType.FIXED]: new FixedDiscountStrategy(),
};

/** Factory — resolve the interchangeable strategy for a coupon type. */
export function getDiscountStrategy(type: CouponType): IDiscountStrategy {
  return strategies[type];
}
