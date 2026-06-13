'use client';

import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import type { Product } from '@prisma/client';
import { ProductCard, type ProductCardData } from '@/components/storefront/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/fetcher';

export default function WishlistPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiFetch<Product[]>('/api/wishlist'),
  });

  const cards: ProductCardData[] = (data ?? []).map((p) => ({
    id: p.id, name: p.name, slug: p.slug, price: p.price, comparePrice: p.comparePrice,
    images: p.images, brand: p.brand, stock: p.stock, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My wishlist</h1>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Heart className="h-12 w-12" />
          <p>Your wishlist is empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
