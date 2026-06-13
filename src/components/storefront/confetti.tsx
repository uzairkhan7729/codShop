'use client';

import { motion } from 'framer-motion';

const COLORS = ['#feee00', '#3866df', '#22c55e', '#ef4444', '#a855f7'];

/** Lightweight confetti burst (Module 8) — no external lib. */
export function Confetti({ count = 60 }: { count?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const left = (i / count) * 100;
        const color = COLORS[i % COLORS.length];
        const delay = (i % 10) * 0.03;
        const drift = ((i * 37) % 120) - 60;
        return (
          <motion.span
            key={i}
            initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
            animate={{ y: '110vh', x: drift, opacity: 0, rotate: 360 }}
            transition={{ duration: 2.2 + (i % 5) * 0.3, delay, ease: 'easeIn' }}
            style={{ left: `${left}%`, backgroundColor: color }}
            className="absolute top-0 h-2.5 w-2.5 rounded-sm"
          />
        );
      })}
    </div>
  );
}

/** Animated success checkmark (SVG path draw). */
export function SuccessCheck() {
  return (
    <svg viewBox="0 0 52 52" className="h-20 w-20 text-green-600">
      <motion.circle
        cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }}
      />
      <motion.path
        d="M14 27l8 8 16-16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.5 }}
      />
    </svg>
  );
}
