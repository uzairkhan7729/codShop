import type { CartItem } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { CartWithItems } from './types';

/** ICartRepository — add/remove items, coupon attach, totals are computed in the service. */
export interface ICartRepository {
  getOrCreate(userId: string): Promise<CartWithItems>;
  findByUser(userId: string): Promise<CartWithItems | null>;
  findItem(cartId: string, productId: string, variantId: string | null): Promise<CartItem | null>;
  addItem(
    cartId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<CartItem>;
  updateItemQuantity(itemId: string, quantity: number): Promise<CartItem>;
  removeItem(itemId: string): Promise<void>;
  clear(cartId: string): Promise<void>;
  attachCoupon(cartId: string, couponId: string | null): Promise<void>;
}

const cartInclude = {
  coupon: true,
  items: { include: { product: true, variant: true }, orderBy: { createdAt: 'asc' as const } },
};

export class CartRepository implements ICartRepository {
  async getOrCreate(userId: string): Promise<CartWithItems> {
    const existing = await prisma.cart.findUnique({ where: { userId }, include: cartInclude });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId }, include: cartInclude });
  }

  findByUser(userId: string): Promise<CartWithItems | null> {
    return prisma.cart.findUnique({ where: { userId }, include: cartInclude });
  }

  findItem(cartId: string, productId: string, variantId: string | null): Promise<CartItem | null> {
    return prisma.cartItem.findFirst({ where: { cartId, productId, variantId } });
  }

  addItem(
    cartId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<CartItem> {
    return prisma.cartItem.create({ data: { cartId, productId, variantId, quantity } });
  }

  updateItemQuantity(itemId: string, quantity: number): Promise<CartItem> {
    return prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  async removeItem(itemId: string): Promise<void> {
    await prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clear(cartId: string): Promise<void> {
    await prisma.cartItem.deleteMany({ where: { cartId } });
    await prisma.cart.update({ where: { id: cartId }, data: { couponId: null } });
  }

  async attachCoupon(cartId: string, couponId: string | null): Promise<void> {
    await prisma.cart.update({ where: { id: cartId }, data: { couponId } });
  }
}
