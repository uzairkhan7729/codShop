'use client';

import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { ProductCard, type ProductCardData } from './product-card';

function useCountdown(targetMs: number) {
  const [remaining, setRemaining] = useState(targetMs);
  useEffect(() => {
    const end = Date.now() + targetMs;
    const t = setInterval(() => setRemaining(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(t);
  }, [targetMs]);

  const totalSeconds = Math.floor(remaining / 1000);
  return {
    hours: String(Math.floor(totalSeconds / 3600)).padStart(2, '0'),
    minutes: String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0'),
    seconds: String(totalSeconds % 60).padStart(2, '0'),
  };
}

export function FlashDeals({ products }: { products: ProductCardData[] }) {
  // Ends 8 hours from page load (client-only to avoid hydration mismatch).
  const { hours, minutes, seconds } = useCountdown(8 * 60 * 60 * 1000);

  if (products.length === 0) return null;

  return (
    <section className="rounded-xl border bg-card p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-destructive" />
          <h2 className="text-xl font-bold">Flash Deals</h2>
        </div>
        <div className="flex items-center gap-1 font-mono text-sm font-semibold">
          {[hours, minutes, seconds].map((unit, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="rounded bg-foreground px-2 py-1 text-background">{unit}</span>
              {i < 2 && <span>:</span>}
            </span>
          ))}
        </div>
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {products.map((p, i) => (
          <div key={p.id} className="w-44 shrink-0 sm:w-52">
            <ProductCard product={p} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
