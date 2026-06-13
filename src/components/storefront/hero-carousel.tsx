'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const SLIDES = [
  { title: 'Mega Tech Sale', subtitle: 'Up to 40% off laptops & phones', href: '/products?category=electronics', bg: 'from-blue-600 to-indigo-700' },
  { title: 'Fashion Week', subtitle: 'New arrivals for the season', href: '/products?category=fashion', bg: 'from-pink-500 to-rose-600' },
  { title: 'Home Makeover', subtitle: 'Refresh your space for less', href: '/products?category=home', bg: 'from-emerald-500 to-teal-600' },
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[index]!;

  return (
    <div className="relative h-56 overflow-hidden rounded-xl sm:h-72 md:h-80">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.5 }}
          className={`absolute inset-0 flex flex-col items-start justify-center gap-4 bg-gradient-to-r ${slide.bg} p-8 text-white md:p-14`}
        >
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-3xl font-extrabold md:text-5xl"
          >
            {slide.title}
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-lg md:text-xl"
          >
            {slide.subtitle}
          </motion.p>
          <Link href={slide.href}>
            <Button variant="brand" size="lg">Shop now</Button>
          </Link>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}
