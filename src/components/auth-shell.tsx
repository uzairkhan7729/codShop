'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Headphones, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { Logo } from '@/components/storefront/logo';

const PERKS = [
  { icon: Truck, title: 'Free shipping', desc: 'On orders over $200' },
  { icon: ShieldCheck, title: 'Secure checkout', desc: 'Encrypted payments via Stripe' },
  { icon: RotateCcw, title: '30-day returns', desc: 'Hassle-free refunds' },
  { icon: Headphones, title: '24/7 support', desc: "We're always here to help" },
];

/** Split-screen auth layout: branded gradient panel + the form. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-indigo-600 to-purple-700 p-12 text-white lg:flex">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

        <Link href="/" className="relative z-10 w-fit">
          <Logo className="text-3xl" />
        </Link>

        <div className="relative z-10 max-w-md">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold leading-tight"
          >
            Shop everything you love, in one place.
          </motion.h2>
          <p className="mt-3 text-white/80">
            Millions of products across electronics, fashion, home and more — at prices you&apos;ll love.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {PERKS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex items-start gap-3 rounded-lg bg-white/10 p-3 backdrop-blur-sm"
              >
                <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <div>
                  <p className="text-sm font-semibold">{p.title}</p>
                  <p className="text-xs text-white/70">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/60">© {new Date().getFullYear()} CodShop. All rights reserved.</p>
      </div>

      {/* Form area */}
      <div className="flex items-center justify-center bg-muted/40 p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg"
        >
          {/* Mobile logo (brand panel hidden on small screens) */}
          <Link href="/" className="mb-6 block text-center lg:hidden">
            <Logo className="text-3xl" />
          </Link>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
