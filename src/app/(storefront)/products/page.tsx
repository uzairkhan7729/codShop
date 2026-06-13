'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Star } from 'lucide-react';
import { ProductCard, type ProductCardData } from '@/components/storefront/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts, type ProductFilterState } from '@/hooks/use-products';
import type { ProductWithRelations } from '@/server/repositories';
import { cn } from '@/lib/utils';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'best_selling', label: 'Best selling' },
];

function toCard(p: ProductWithRelations): ProductCardData {
  return {
    id: p.id, name: p.name, slug: p.slug, price: p.price, comparePrice: p.comparePrice,
    images: p.images, brand: p.brand, stock: p.stock, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
  };
}

function ProductsBrowser() {
  const params = useSearchParams();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(params.get('sort') ?? 'newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState<number | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters: ProductFilterState = useMemo(
    () => ({
      search: params.get('search') ?? undefined,
      category: params.get('category') ?? undefined,
      sort,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minRating,
      page,
      pageSize: 12,
    }),
    [params, sort, minPrice, maxPrice, minRating, page],
  );

  const { data, isLoading, isFetching } = useProducts(filters);
  const heading = params.get('search')
    ? `Results for "${params.get('search')}"`
    : params.get('category')
      ? `${params.get('category')}`
      : 'All products';

  return (
    <div className="container py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold capitalize">{heading}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="md:hidden" onClick={() => setFiltersOpen((o) => !o)}>
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </Button>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            aria-label="Sort products"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        {/* Filters sidebar */}
        <motion.aside
          initial={false}
          animate={{ height: filtersOpen || typeof window === 'undefined' ? 'auto' : 'auto' }}
          className={cn('space-y-6', filtersOpen ? 'block' : 'hidden md:block')}
        >
          <div>
            <h3 className="mb-2 text-sm font-semibold">Price range</h3>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="Min" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} className="h-9" />
              <span className="text-muted-foreground">–</span>
              <Input type="number" placeholder="Max" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} className="h-9" />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Rating</h3>
            <div className="space-y-1">
              {[4, 3, 2].map((r) => (
                <button
                  key={r}
                  onClick={() => { setMinRating(minRating === r ? undefined : r); setPage(1); }}
                  className={cn(
                    'flex w-full items-center gap-1 rounded-md px-2 py-1 text-sm',
                    minRating === r ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                  )}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('h-3.5 w-3.5', i < r ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
                  ))}
                  <span className="ml-1">& up</span>
                </button>
              ))}
            </div>
          </div>
        </motion.aside>

        {/* Grid */}
        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm">Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <motion.div layout className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', isFetching && 'opacity-60')}>
                {data.items.map((p, i) => (
                  <ProductCard key={p.id} product={toCard(p)} index={i} />
                ))}
              </motion.div>

              {/* Pagination */}
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {data.page} of {data.totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container py-10 text-center text-muted-foreground">Loading…</div>}>
      <ProductsBrowser />
    </Suspense>
  );
}
