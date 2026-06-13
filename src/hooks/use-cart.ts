'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiDelete, apiFetch, apiPost, apiPut, FetchError } from '@/lib/fetcher';
import { type GuestCartItem, useGuestCart } from '@/stores/cart-store';
import type { CartView } from '@/server/services/cart.service';

/** Server cart query (only when authenticated). */
export function useServerCart() {
  const { status } = useSession();
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => apiFetch<CartView>('/api/cart'),
    enabled: status === 'authenticated',
  });
}

/** Cart item count for the navbar badge (server or guest). */
export function useCartCount(): number {
  const { status } = useSession();
  const guestCount = useGuestCart((s) => s.totalCount());
  const { data } = useServerCart();
  return status === 'authenticated' ? (data?.itemCount ?? 0) : guestCount;
}

export interface AddToCartArgs {
  productId: string;
  variantId?: string | null;
  quantity?: number;
  // guest-only display fields
  name: string;
  slug: string;
  image: string | null;
  price: number;
  maxQuantity: number;
}

/** Add-to-cart that targets the server cart when logged in, else the guest store. */
export function useAddToCart() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const addGuest = useGuestCart((s) => s.addItem);

  return useMutation({
    mutationFn: async (args: AddToCartArgs) => {
      if (status === 'authenticated') {
        return apiPost<CartView>('/api/cart/items', {
          productId: args.productId,
          variantId: args.variantId ?? null,
          quantity: args.quantity ?? 1,
        });
      }
      const item: GuestCartItem = {
        productId: args.productId,
        variantId: args.variantId ?? null,
        name: args.name,
        slug: args.slug,
        image: args.image,
        price: args.price,
        quantity: args.quantity ?? 1,
        maxQuantity: args.maxQuantity,
      };
      addGuest(item);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart');
    },
    onError: (err) => {
      toast.error(err instanceof FetchError ? err.message : 'Could not add to cart');
    },
  });
}

/** Mutations for the cart page (authenticated). */
export function useCartMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cart'] });

  const updateQuantity = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      apiPut<CartView>(`/api/cart/items/${id}`, { quantity }),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof FetchError ? err.message : 'Update failed'),
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => apiDelete<CartView>(`/api/cart/items/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Item removed');
    },
  });

  const applyCoupon = useMutation({
    mutationFn: (code: string) => apiPost<CartView>('/api/cart/coupon', { code }),
    onSuccess: () => {
      invalidate();
      toast.success('Coupon applied');
    },
    onError: (err) => toast.error(err instanceof FetchError ? err.message : 'Invalid coupon'),
  });

  const removeCoupon = useMutation({
    mutationFn: () => apiDelete<CartView>('/api/cart/coupon'),
    onSuccess: invalidate,
  });

  return { updateQuantity, removeItem, applyCoupon, removeCoupon };
}

/** On login, push the guest cart to the server then clear local storage. */
export function useSyncGuestCart() {
  const queryClient = useQueryClient();
  const items = useGuestCart((s) => s.items);
  const clear = useGuestCart((s) => s.clear);

  return useMutation({
    mutationFn: async () => {
      if (items.length === 0) return null;
      const result = await apiPost<CartView>('/api/cart/sync', {
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      });
      clear();
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}
