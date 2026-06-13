import type { Coupon, CouponType } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import type { ICouponRepository, Paginated, PaginationParams } from '@/server/repositories';
import { getDiscountStrategy } from './discounts/discount-strategy';

export interface CouponWriteInput {
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageLimitPerUser?: number;
  isActive?: boolean;
  startsAt?: Date;
  expiresAt?: Date;
}

export interface CouponValidation {
  coupon: Coupon;
  discount: number;
}

/**
 * CouponService — validates coupons against business rules and computes the
 * discount via the appropriate (interchangeable) discount strategy.
 */
export class CouponService {
  constructor(private readonly coupons: ICouponRepository) {}

  /**
   * Validate a coupon for a given user/subtotal and return the discount amount.
   * Throws a BadRequestError describing the first rule that fails.
   */
  async validate(code: string, userId: string, subtotal: number): Promise<CouponValidation> {
    const coupon = await this.coupons.findByCode(code.trim());
    if (!coupon) throw new NotFoundError('Coupon code not found', 'COUPON_NOT_FOUND');
    if (!coupon.isActive) throw new BadRequestError('This coupon is no longer active', 'COUPON_INACTIVE');

    const now = new Date();
    if (coupon.startsAt > now) {
      throw new BadRequestError('This coupon is not yet valid', 'COUPON_NOT_STARTED');
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestError('This coupon has expired', 'COUPON_EXPIRED');
    }
    if (subtotal < coupon.minPurchase) {
      throw new BadRequestError(
        `Minimum purchase of ${coupon.minPurchase} required for this coupon`,
        'COUPON_MIN_PURCHASE',
      );
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestError('This coupon has reached its usage limit', 'COUPON_LIMIT_REACHED');
    }

    const userRedemptions = await this.coupons.countUserRedemptions(coupon.id, userId);
    if (userRedemptions >= coupon.usageLimitPerUser) {
      throw new BadRequestError('You have already used this coupon', 'COUPON_USER_LIMIT');
    }

    const discount = getDiscountStrategy(coupon.type).calculate(coupon, subtotal);
    if (discount <= 0) {
      throw new BadRequestError('This coupon does not apply to your cart', 'COUPON_NO_EFFECT');
    }

    return { coupon, discount };
  }

  /** Record a redemption + bump the global usage counter (called after order placement). */
  async redeem(couponId: string, userId: string, orderId: string): Promise<void> {
    await this.coupons.recordRedemption(couponId, userId, orderId);
    await this.coupons.incrementUsage(couponId);
  }

  // ───────────── Admin operations ─────────────

  list(pagination: PaginationParams): Promise<Paginated<Coupon>> {
    return this.coupons.findMany(pagination);
  }

  create(input: CouponWriteInput): Promise<Coupon> {
    return this.coupons.create({
      code: input.code,
      description: input.description,
      type: input.type,
      value: input.value,
      minPurchase: input.minPurchase ?? 0,
      maxDiscount: input.maxDiscount,
      usageLimit: input.usageLimit,
      usageLimitPerUser: input.usageLimitPerUser ?? 1,
      isActive: input.isActive ?? true,
      startsAt: input.startsAt,
      expiresAt: input.expiresAt,
    });
  }

  async update(id: string, input: Partial<CouponWriteInput>): Promise<Coupon> {
    const existing = await this.coupons.findById(id);
    if (!existing) throw new NotFoundError('Coupon not found', 'COUPON_NOT_FOUND');
    return this.coupons.update(id, {
      ...input,
      ...(input.code ? { code: input.code.toUpperCase() } : {}),
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.coupons.findById(id);
    if (!existing) throw new NotFoundError('Coupon not found', 'COUPON_NOT_FOUND');
    await this.coupons.delete(id);
  }
}
