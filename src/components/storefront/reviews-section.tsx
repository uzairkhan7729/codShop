'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, apiPost, FetchError } from '@/lib/fetcher';
import { cn, formatDate } from '@/lib/utils';
import type { Paginated, RatingAggregate, ReviewWithUser } from '@/server/repositories';

interface ReviewsResponse {
  reviews: Paginated<ReviewWithUser>;
  summary: RatingAggregate;
}

export function ReviewsSection({ slug, productId }: { slug: string; productId: string }) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [title, setTitle] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', slug, page],
    queryFn: () => apiFetch<ReviewsResponse>(`/api/products/${slug}/reviews?page=${page}&pageSize=5`),
  });

  const submit = useMutation({
    mutationFn: () => apiPost('/api/reviews', { productId, rating, title, comment }),
    onSuccess: () => {
      toast.success('Thanks for your review!');
      setComment(''); setTitle('');
      queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
    },
    onError: (err) => toast.error(err instanceof FetchError ? err.message : 'Could not submit review'),
  });

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-bold">Customer reviews</h2>

      {data && (
        <div className="mb-6 flex flex-wrap items-center gap-6 rounded-lg border p-4">
          <div className="text-center">
            <div className="text-4xl font-extrabold">{data.summary.average.toFixed(1)}</div>
            <div className="flex justify-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('h-4 w-4', i < Math.round(data.summary.average) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
              ))}
            </div>
            <div className="text-xs text-muted-foreground">{data.summary.count} reviews</div>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = data.summary.distribution[star as 1 | 2 | 3 | 4 | 5];
              const pct = data.summary.count ? (count / data.summary.count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3">{star}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-amber-400" />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Write review */}
      {status === 'authenticated' && (
        <form
          onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
          className="mb-6 space-y-3 rounded-lg border p-4"
        >
          <p className="text-sm font-medium">Write a review</p>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} type="button" onClick={() => setRating(i + 1)} aria-label={`Rate ${i + 1} stars`}>
                <Star className={cn('h-6 w-6', i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience…"
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? 'Submitting…' : 'Submit review'}
          </Button>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : data && data.reviews.items.length > 0 ? (
        <div className="space-y-4">
          {data.reviews.items.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">{r.user.name}</span>
                <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              </div>
              <div className="mb-2 flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('h-3.5 w-3.5', i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
                ))}
              </div>
              {r.title && <p className="text-sm font-medium">{r.title}</p>}
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
            </motion.div>
          ))}
          {data.reviews.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="self-center text-sm text-muted-foreground">{page} / {data.reviews.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.reviews.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
      )}
    </section>
  );
}
