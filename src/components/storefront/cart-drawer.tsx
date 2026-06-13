'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence, animate, useMotionValue } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServerCart, useCartMutations } from '@/hooks/use-cart';
import { useGuestCart } from '@/stores/cart-store';
import { useCartUI } from '@/stores/cart-ui-store';
import { PRICING } from '@/lib/pricing';
import { formatCurrency } from '@/lib/utils';

interface DrawerLine {
  key: string;
  name: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export function CartDrawer() {
  const { drawerOpen, closeDrawer } = useCartUI();
  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-[70] bg-black/40"
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-label="Shopping cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-[71] flex h-full w-full max-w-md flex-col bg-background shadow-2xl"
          >
            <DrawerContents onClose={closeDrawer} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerContents({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { status } = useSession();
  const isAuth = status === 'authenticated';

  const { data: serverCart } = useServerCart();
  const { updateQuantity, removeItem } = useCartMutations();

  const guestItems = useGuestCart((s) => s.items);
  const guestUpdate = useGuestCart((s) => s.updateQuantity);
  const guestRemove = useGuestCart((s) => s.removeItem);
  const guestSubtotal = useGuestCart((s) => s.subtotal());

  const lines: DrawerLine[] = isAuth
    ? (serverCart?.items ?? []).map((i) => ({
        key: i.id, name: i.name, image: i.image, unitPrice: i.unitPrice, quantity: i.quantity, lineTotal: i.lineTotal,
      }))
    : guestItems.map((i) => ({
        key: `${i.productId}-${i.variantId}`, name: i.name, image: i.image, unitPrice: i.price, quantity: i.quantity, lineTotal: i.price * i.quantity,
      }));

  const subtotal = isAuth ? (serverCart?.pricing.subtotal ?? 0) : guestSubtotal;

  const changeQty = (line: DrawerLine, qty: number, guestKey: string) => {
    if (qty < 1) return;
    if (isAuth) updateQuantity.mutate({ id: line.key, quantity: qty });
    else {
      const gi = guestItems.find((i) => `${i.productId}-${i.variantId}` === guestKey);
      if (gi) guestUpdate(gi.productId, gi.variantId, qty);
    }
  };
  const remove = (line: DrawerLine) => {
    if (isAuth) removeItem.mutate(line.key);
    else {
      const gi = guestItems.find((i) => `${i.productId}-${i.variantId}` === line.key);
      if (gi) guestRemove(gi.productId, gi.variantId);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between border-b p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <ShoppingBag className="h-5 w-5" /> Your cart
        </h2>
        <button onClick={onClose} aria-label="Close cart" className="rounded-md p-1 hover:bg-muted">
          <X className="h-5 w-5" />
        </button>
      </header>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <ShoppingBag className="h-12 w-12" />
          <p>Your cart is empty</p>
          <Button onClick={() => { onClose(); router.push('/products'); }}>Browse products</Button>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <AnimatePresence initial={false}>
              {lines.map((line) => (
                <motion.div
                  key={line.key}
                  layout
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  className="flex gap-3 rounded-lg border p-2"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {line.image && <Image src={line.image} alt={line.name} fill sizes="64px" className="object-cover" />}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="line-clamp-2 text-sm font-medium">{line.name}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(line.unitPrice)}</span>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-md border">
                        <motion.button whileTap={{ scale: 0.8 }} className="px-2 py-1" onClick={() => changeQty(line, line.quantity - 1, line.key)} disabled={line.quantity <= 1} aria-label="Decrease">
                          <Minus className="h-3 w-3" />
                        </motion.button>
                        <span className="w-7 text-center text-sm">{line.quantity}</span>
                        <motion.button whileTap={{ scale: 0.8 }} className="px-2 py-1" onClick={() => changeQty(line, line.quantity + 1, line.key)} aria-label="Increase">
                          <Plus className="h-3 w-3" />
                        </motion.button>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(line.lineTotal)}</span>
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.8 }} onClick={() => remove(line)} className="self-start text-muted-foreground hover:text-destructive" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <footer className="space-y-3 border-t p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold"><AnimatedPrice value={subtotal} /></span>
            </div>
            {!isAuth && subtotal < PRICING.freeShippingThreshold && (
              <p className="text-xs text-muted-foreground">
                Add {formatCurrency(PRICING.freeShippingThreshold - subtotal)} more for free shipping.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { onClose(); router.push('/cart'); }}>View cart</Button>
              <Button variant="brand" onClick={() => { onClose(); router.push(isAuth ? '/checkout' : '/login?callbackUrl=/checkout'); }}>
                Checkout
              </Button>
            </div>
          </footer>
        </>
      )}
    </>
  );
}

/** Tweens the displayed amount when the value changes (number counter). */
function AnimatedPrice({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.4, onUpdate: (v) => setDisplay(v) });
    return () => controls.stop();
  }, [value, mv]);
  return <>{formatCurrency(display)}</>;
}
