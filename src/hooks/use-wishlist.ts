'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Product } from '@prisma/client';
import { apiFetch, apiPost, FetchError } from '@/lib/fetcher';

/** Set of wishlisted product ids for quick "is this saved?" lookups. */
export function useWishlistIds(): Set<string> {
  const { status } = useSession();
  const { data } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiFetch<Product[]>('/api/wishlist'),
    enabled: status === 'authenticated',
    staleTime: 60_000,
  });
  return new Set((data ?? []).map((p) => p.id));
}

/** Toggle a product in the wishlist with clear feedback + auth handling. */
export function useToggleWishlist() {
  const { status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (productId: string) => apiPost<{ added: boolean }>('/api/wishlist', { productId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success(data.added ? 'Saved to wishlist ❤️' : 'Removed from wishlist');
    },
    onError: (err) => {
      toast.error(err instanceof FetchError ? err.message : 'Could not update wishlist');
    },
  });

  /** Call this from a click handler. Returns true if the toggle was attempted. */
  const toggle = (productId: string): boolean => {
    if (status === 'loading') return false; // session not ready yet — ignore the click
    if (status !== 'authenticated') {
      toast.message('Sign in to save items to your wishlist');
      router.push('/login?callbackUrl=/account/wishlist');
      return false;
    }
    mutation.mutate(productId);
    return true;
  };

  return { toggle, isPending: mutation.isPending };
}
