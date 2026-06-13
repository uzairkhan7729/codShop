import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Guest cart store (Zustand + localStorage). Used when the visitor is not
 * authenticated; on login the items are POSTed to /api/cart/sync and merged
 * into the server cart, then cleared here.
 */
export interface GuestCartItem {
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  quantity: number;
  maxQuantity: number;
}

interface CartState {
  items: GuestCartItem[];
  addItem: (item: GuestCartItem) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  clear: () => void;
  totalCount: () => number;
  subtotal: () => number;
}

const sameLine = (a: GuestCartItem, productId: string, variantId: string | null) =>
  a.productId === productId && a.variantId === variantId;

export const useGuestCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item.productId, item.variantId));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item.productId, item.variantId)
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.maxQuantity) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      updateQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            sameLine(i, productId, variantId)
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQuantity)) }
              : i,
          ),
        })),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, productId, variantId)),
        })),
      clear: () => set({ items: [] }),
      totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'codshop-guest-cart' },
  ),
);
