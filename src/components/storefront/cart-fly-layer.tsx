'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useCartUI, type CartFlight } from '@/stores/cart-ui-store';

/** Renders product images flying in an arc from the click point to the cart icon. */
export function CartFlyLayer() {
  const flights = useCartUI((s) => s.flights);
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden>
      {flights.map((f) => (
        <FlyingImage key={f.id} flight={f} />
      ))}
    </div>
  );
}

function FlyingImage({ flight }: { flight: CartFlight }) {
  const endFlight = useCartUI((s) => s.endFlight);
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = document.getElementById('cart-icon');
    const rect = el?.getBoundingClientRect();
    setTarget(
      rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth - 60, y: 40 },
    );
  }, []);

  if (!target) return null;
  const SIZE = 64;
  const peak = Math.min(flight.startY, target.y) - 140;

  return (
    <motion.img
      src={flight.image}
      alt=""
      className="absolute rounded-lg object-cover shadow-xl ring-2 ring-white"
      style={{ width: SIZE, height: SIZE, left: -SIZE / 2, top: -SIZE / 2 }}
      initial={{ x: flight.startX, y: flight.startY, scale: 1, opacity: 1 }}
      animate={{
        x: [flight.startX, (flight.startX + target.x) / 2, target.x],
        y: [flight.startY, peak, target.y],
        scale: [1, 0.85, 0.15],
        opacity: [1, 1, 0.3],
        rotate: [0, 20, -10],
      }}
      transition={{ duration: 0.85, ease: 'easeIn', times: [0, 0.5, 1] }}
      onAnimationComplete={() => endFlight(flight.id)}
    />
  );
}
