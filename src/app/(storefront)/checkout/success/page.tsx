'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Confetti, SuccessCheck } from '@/components/storefront/confetti';
import { apiPost } from '@/lib/fetcher';
import { useGuestCart } from '@/stores/cart-store';

function SuccessInner() {
  const params = useSearchParams();
  const orderId = params.get('orderId');
  const [confirmed, setConfirmed] = useState(false);
  const queryClient = useQueryClient();
  const clearGuest = useGuestCart((s) => s.clear);

  useEffect(() => {
    if (!orderId) return;
    // The webhook is the source of truth, but confirm here for instant feedback.
    apiPost('/api/checkout/confirm', { orderId }).catch(() => undefined).finally(() => setConfirmed(true));
    // Payment done — empty the cart (guest store + refresh the server cart badge).
    clearGuest();
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  }, [orderId, clearGuest, queryClient]);

  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <Confetti />
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
        <SuccessCheck />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-3xl font-bold">
        Order placed!
      </motion.h1>
      <p className="max-w-md text-muted-foreground">
        Thank you for your purchase. {confirmed ? 'Your payment is confirmed and' : 'Your order is being processed and'} a
        confirmation email is on its way.
      </p>
      <div className="flex gap-3">
        <Link href="/account/orders"><Button variant="brand">View my orders</Button></Link>
        <Link href="/products"><Button variant="outline">Continue shopping</Button></Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
