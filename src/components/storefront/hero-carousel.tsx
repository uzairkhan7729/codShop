'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const SLIDES = [
  {
    title: 'Mega Tech Sale',
    subtitle: 'Up to 40% off laptops & phones',
    href: '/products?category=electronics',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1600&q=80',
    fallback: 'https://picsum.photos/seed/codshop-tech/1600/600',
    tint: 'from-blue-900/80 via-blue-900/40 to-transparent',
  },
  {
    title: 'Fashion Week',
    subtitle: 'New arrivals for the season',
    href: '/products?category=fashion',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
    fallback: 'https://picsum.photos/seed/codshop-fashion/1600/600',
    tint: 'from-rose-900/80 via-rose-900/40 to-transparent',
  },
  {
    title: 'Home Makeover',
    subtitle: 'Refresh your space for less',
    href: '/products?category=home',
    image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1600&q=80',
    fallback: 'https://picsum.photos/seed/codshop-home/1600/600',
    tint: 'from-emerald-900/80 via-emerald-900/40 to-transparent',
  },
];

function SlideImage({ src, fallback, alt }: { src: string; fallback: string; alt: string }) {
  const [url, setUrl] = useState(src);
  return (
    <Image
      src={url}
      alt={alt}
      fill
      priority
      sizes="100vw"
      className="object-cover"
      onError={() => url !== fallback && setUrl(fallback)}
    />
  );
}

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
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <SlideImage src={slide.image} fallback={slide.fallback} alt={slide.title} />
          <div className={`absolute inset-0 bg-gradient-to-r ${slide.tint}`} />

          <div className="absolute inset-0 flex flex-col items-start justify-center gap-4 p-8 text-white md:p-14">
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="max-w-md text-3xl font-extrabold drop-shadow md:text-5xl"
            >
              {slide.title}
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-lg drop-shadow md:text-xl"
            >
              {slide.subtitle}
            </motion.p>
            <Link href={slide.href}>
              <Button variant="brand" size="lg">Shop now</Button>
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
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
