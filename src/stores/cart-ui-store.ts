import { create } from 'zustand';

/** A product image "flying" from the click point toward the cart icon. */
export interface CartFlight {
  id: string;
  image: string;
  startX: number;
  startY: number;
}

interface CartUIState {
  drawerOpen: boolean;
  flights: CartFlight[];
  /** Bumps on every successful add — drives the cart-icon bounce + badge pop. */
  pulse: number;
  openDrawer: () => void;
  closeDrawer: () => void;
  launchFlight: (image: string, startX: number, startY: number) => void;
  endFlight: (id: string) => void;
  bump: () => void;
}

export const useCartUI = create<CartUIState>((set) => ({
  drawerOpen: false,
  flights: [],
  pulse: 0,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  launchFlight: (image, startX, startY) =>
    set((s) => ({
      flights: [...s.flights, { id: `${Date.now()}-${Math.round(startX)}-${s.flights.length}`, image, startX, startY }],
    })),
  endFlight: (id) => set((s) => ({ flights: s.flights.filter((f) => f.id !== id) })),
  bump: () => set((s) => ({ pulse: s.pulse + 1 })),
}));
