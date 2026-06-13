'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, PackageSearch, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { apiFetch, FetchError } from '@/lib/fetcher';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { OrderStatus } from '@prisma/client';

interface TrackResult {
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  total: number;
  trackingNumber: string | null;
  carrier: string | null;
  items: { name: string; image: string | null; quantity: number; total: number }[];
  shippingTo: { city: string; country: string };
}

const FLOW: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function TrackInner() {
  const params = useSearchParams();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const o = params.get('orderNumber');
    if (o) setOrderNumber(o);
  }, [params]);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch<TrackResult>(
        `/api/track?orderNumber=${encodeURIComponent(orderNumber.trim())}&email=${encodeURIComponent(email.trim())}`,
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof FetchError ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = result ? FLOW.indexOf(result.status) : -1;

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-6 flex items-center gap-2">
        <PackageSearch className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Track your order</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter your order number and the email used at checkout — no account needed.
      </p>

      <form onSubmit={lookup} className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label>Order number</Label>
          <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ORD-2026-00001" required />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Track'}</Button>
      </form>

      {error && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-6 rounded-lg border p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">{result.orderNumber}</h2>
              <p className="text-sm text-muted-foreground">Placed {formatDate(result.createdAt)} · {formatCurrency(result.total)}</p>
            </div>
            <OrderStatusBadge status={result.status} />
          </div>

          {/* Status stepper */}
          {result.status === 'CANCELLED' || result.status === 'REFUNDED' ? (
            <p className="text-sm text-muted-foreground">This order was {result.status.toLowerCase()}.</p>
          ) : (
            <div className="flex items-center">
              {FLOW.map((step, i) => (
                <div key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs',
                      i <= currentStep ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground')}>
                      {i <= currentStep ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className="text-[11px] capitalize text-muted-foreground">{step.toLowerCase()}</span>
                  </div>
                  {i < FLOW.length - 1 && <div className={cn('mx-1 h-0.5 flex-1', i < currentStep ? 'bg-green-600' : 'bg-muted')} />}
                </div>
              ))}
            </div>
          )}

          {result.trackingNumber && (
            <div className="flex items-center gap-2 rounded-md bg-muted/40 p-3 text-sm">
              <Truck className="h-4 w-4 text-primary" />
              <span>Tracking: <strong>{result.trackingNumber}</strong>{result.carrier && ` via ${result.carrier}`}</span>
            </div>
          )}

          <div className="space-y-2">
            {result.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                  {it.image && <Image src={it.image} alt={it.name} fill sizes="48px" className="object-cover" />}
                </div>
                <span className="flex-1 line-clamp-1">{it.name} × {it.quantity}</span>
                <span>{formatCurrency(it.total)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackInner />
    </Suspense>
  );
}
