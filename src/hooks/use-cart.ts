'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { apiDelete, apiFetch, apiPost, apiPut, FetchError } from '@/lib/fetcher';
import { type GuestCartItem, useGuestCart } from '@/stores/cart-store';
import { useCartUI } from '@/stores/cart-ui-store';
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
  /** Click coordinates — used to launch the fly-to-cart animation. */
  originX?: number;
  originY?: number;
}

/**
 * Add-to-cart with the full UX: fly-to-cart animation, cart-icon pulse,
 * UNDO toast, and the mini-drawer sliding in shortly after. Targets the server
 * cart when logged in, else the guest store.
 */
export function useAddToCart() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const addGuest = useGuestCart((s) => s.addItem);
  const removeGuest = useGuestCart((s) => s.removeItem);
  const { launchFlight, bump, openDrawer } = useCartUI();

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
    onMutate: (args) => {
      // Fire the visual immediately (optimistic), before the request resolves.
      if (args.image && args.originX != null && args.originY != null) {
        launchFlight(args.image, args.originX, args.originY);
      }
    },
    onSuccess: (data, args) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      bump();
      const undo = () => {
        if (status === 'authenticated' && data) {
          const line = data.items.find(
            (i) => i.productId === args.productId && i.variantId === (args.variantId ?? null),
          );
          if (line) {
            apiDelete<CartView>(`/api/cart/items/${line.id}`)
              .then(() => queryClient.invalidateQueries({ queryKey: ['cart'] }))
              .catch(() => undefined);
          }
        } else {
          removeGuest(args.productId, args.variantId ?? null);
        }
      };
      toast.success(`${args.name} added to cart`, {
        action: { label: 'Undo', onClick: undo },
        duration: 3000,
      });
      // Slide the mini-cart in once the flight has landed.
      setTimeout(() => openDrawer(), 900);
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
