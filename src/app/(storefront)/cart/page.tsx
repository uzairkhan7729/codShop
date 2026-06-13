'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useServerCart, useCartMutations } from '@/hooks/use-cart';
import { useGuestCart } from '@/stores/cart-store';
import { PRICING } from '@/lib/pricing';
import { formatCurrency } from '@/lib/utils';

export default function CartPage() {
  const { status } = useSession();
  if (status === 'authenticated') return <ServerCart />;
  return <GuestCartView />;
}

function EmptyCart() {
  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <ShoppingBag className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Your cart is empty</h1>
      <p className="text-muted-foreground">Looks like you haven&apos;t added anything yet.</p>
      <Link href="/products"><Button variant="brand" size="lg">Start shopping</Button></Link>
    </div>
  );
}

function Summary({
  subtotal, discount, tax, shipping, total, children,
}: {
  subtotal: number; discount: number; tax: number; shipping: number; total: number; children?: React.ReactNode;
}) {
  return (
    <div className="h-fit space-y-3 rounded-lg border p-5">
      <h2 className="text-lg font-semibold">Order summary</h2>
      <Row label="Subtotal" value={formatCurrency(subtotal)} />
      {discount > 0 && <Row label="Discount" value={`- ${formatCurrency(discount)}`} accent />}
      <Row label="Tax (5% VAT)" value={formatCurrency(tax)} />
      <Row label="Shipping" value={shipping === 0 ? 'Free' : formatCurrency(shipping)} />
      <div className="border-t pt-3">
        <Row label="Total" value={formatCurrency(total)} bold />
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'text-base font-bold' : ''} ${accent ? 'text-green-600' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** Authenticated server cart with full features. */
function ServerCart() {
  const router = useRouter();
  const { data: cart, isLoading } = useServerCart();
  const { updateQuantity, removeItem, applyCoupon, removeCoupon } = useCartMutations();
  const [code, setCode] = useState('');

  if (isLoading) return <div className="container py-10 text-center text-muted-foreground">Loading cart…</div>;
  if (!cart || cart.items.length === 0) return <EmptyCart />;

  const { pricing } = cart;

  return (
    <div className="container py-6">
      <h1 className="mb-6 text-2xl font-bold">Shopping cart</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {cart.items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="flex gap-4 rounded-lg border p-3"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.image && <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />}
                </div>
                <div className="flex flex-1 flex-col">
                  <Link href={`/products/${item.slug}`} className="line-clamp-2 font-medium hover:text-primary">
                    {item.name}
                  </Link>
                  <span className="text-sm text-muted-foreground">{formatCurrency(item.unitPrice)} each</span>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-md border">
                      <button className="px-2 py-1" onClick={() => updateQuantity.mutate({ id: item.id, quantity: item.quantity - 1 })} disabled={item.quantity <= 1} aria-label="Decrease">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button className="px-2 py-1" onClick={() => updateQuantity.mutate({ id: item.id, quantity: item.quantity + 1 })} disabled={item.quantity >= item.maxQuantity} aria-label="Increase">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.lineTotal)}</span>
                  </div>
                </div>
                <button onClick={() => removeItem.mutate(item.id)} className="self-start text-muted-foreground hover:text-destructive" aria-label="Remove item">
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Summary subtotal={pricing.subtotal} discount={pricing.discount} tax={pricing.tax} shipping={pricing.shippingCost} total={pricing.total}>
          {cart.couponCode ? (
            <div className="flex items-center justify-between rounded-md bg-green-50 p-2 text-sm">
              <span className="font-medium text-green-700">Coupon {cart.couponCode}</span>
              <button onClick={() => removeCoupon.mutate()} aria-label="Remove coupon"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); applyCoupon.mutate(code); }} className="flex gap-2">
              <Input placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} className="h-9" />
              <Button type="submit" variant="outline" size="sm" disabled={applyCoupon.isPending}>Apply</Button>
            </form>
          )}
          <Button className="w-full" size="lg" variant="brand" onClick={() => router.push('/checkout')}>
            Proceed to checkout
          </Button>
        </Summary>
      </div>
    </div>
  );
}

/** Guest cart (localStorage). Prompts sign-in for coupons/checkout. */
function GuestCartView() {
  const router = useRouter();
  const items = useGuestCart((s) => s.items);
  const updateQuantity = useGuestCart((s) => s.updateQuantity);
  const removeItem = useGuestCart((s) => s.removeItem);
  const subtotal = useGuestCart((s) => s.subtotal());

  if (items.length === 0) return <EmptyCart />;

  const tax = Math.round(subtotal * PRICING.taxRate * 100) / 100;
  const shipping = subtotal >= PRICING.freeShippingThreshold || subtotal === 0 ? 0 : PRICING.shippingFlatRate;
  const total = Math.round((subtotal + tax + shipping) * 100) / 100;

  return (
    <div className="container py-6">
      <h1 className="mb-6 text-2xl font-bold">Shopping cart</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={`${item.productId}-${item.variantId}`}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-4 rounded-lg border p-3"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.image && <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />}
                </div>
                <div className="flex flex-1 flex-col">
                  <Link href={`/products/${item.slug}`} className="line-clamp-2 font-medium hover:text-primary">{item.name}</Link>
                  <span className="text-sm text-muted-foreground">{formatCurrency(item.price)} each</span>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-md border">
                      <button className="px-2 py-1" onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button className="px-2 py-1" onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)} aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
                <button onClick={() => removeItem(item.productId, item.variantId)} className="self-start text-muted-foreground hover:text-destructive" aria-label="Remove item">
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Summary subtotal={subtotal} discount={0} tax={tax} shipping={shipping} total={total}>
          <Button className="w-full" size="lg" variant="brand" onClick={() => router.push('/checkout')}>
            Checkout as guest
          </Button>
          <Button className="w-full" size="lg" variant="outline" onClick={() => router.push('/login?callbackUrl=/checkout')}>
            Sign in for faster checkout
          </Button>
          <p className="text-center text-xs text-muted-foreground">Coupons require an account.</p>
        </Summary>
      </div>
    </div>
  );
}
