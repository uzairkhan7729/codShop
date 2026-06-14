'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { apiFetch } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import type { MegaCategory } from '@/server/repositories';

const fallbackImg = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/200/200`;

/**
 * Category bar + shared mega flyout. Hovering "All Categories" OR any department
 * link opens the panel below, focused on that department (Amazon-style).
 * Lives in a non-overflow `relative` wrapper so the panel is never clipped.
 */
export function CategoryBar() {
  const { data } = useQuery({
    queryKey: ['categories', 'mega'],
    queryFn: () => apiFetch<MegaCategory[]>('/api/categories?mega=true'),
    staleTime: 10 * 60 * 1000,
  });

  const depts = data ?? [];
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = depts.find((d) => d.id === activeId) ?? depts[0];

  const openOn = (id: string | null) => {
    setActiveId(id);
    setOpen(true);
  };

  return (
    <div className="relative border-t bg-muted/40" onMouseLeave={() => setOpen(false)}>
      <div className="container flex items-center gap-1 py-1">
        <button
          onMouseEnter={() => openOn(depts[0]?.id ?? null)}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-background',
            open && 'bg-background',
          )}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <LayoutGrid className="h-4 w-4" />
          All Categories
        </button>

        <span className="mx-1 hidden h-5 w-px bg-border md:block" />

        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {depts.map((dept) => (
            <Link
              key={dept.id}
              href={`/products?category=${dept.slug}`}
              onMouseEnter={() => openOn(dept.id)}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-sm transition-colors hover:bg-background hover:text-foreground',
                open && active?.id === dept.id ? 'bg-background font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {dept.name}
            </Link>
          ))}
        </div>

        {/* Right-aligned promo / service links */}
        <div className="ml-auto hidden shrink-0 items-center gap-1 lg:flex" onMouseEnter={() => setOpen(false)}>
          <Link href="/products?sort=best_selling" className="whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium text-rose-600 hover:bg-background">
            Today&apos;s Deals
          </Link>
          <Link href="/products?sort=newest" className="whitespace-nowrap rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-background hover:text-foreground">
            New Arrivals
          </Link>
          <Link href="/products?sort=best_selling" className="whitespace-nowrap rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-background hover:text-foreground">
            Best Sellers
          </Link>
          <Link href="/account/orders" className="whitespace-nowrap rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-background hover:text-foreground">
            Customer Service
          </Link>
        </div>
      </div>

      {/* Shared flyout panel (full-width, below the bar) */}
      <AnimatePresence>
        {open && active && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full z-50 border-b bg-popover shadow-2xl"
          >
            <div className="container flex">
              {/* Department rail with thumbnails */}
              <ul className="w-60 shrink-0 border-r py-2">
                {depts.map((dept) => (
                  <li key={dept.id}>
                    <Link
                      href={`/products?category=${dept.slug}`}
                      onMouseEnter={() => setActiveId(dept.id)}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        active.id === dept.id ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted',
                      )}
                    >
                      <Image
                        src={dept.image ?? fallbackImg(dept.slug)}
                        alt=""
                        width={28}
                        height={28}
                        className="h-7 w-7 shrink-0 rounded-md object-cover"
                      />
                      <span className="flex-1">{dept.name}</span>
                      <ChevronRight className={cn('h-4 w-4 transition-opacity', active.id === dept.id ? 'opacity-100' : 'opacity-30')} />
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Active department's categories + subcategories */}
              <motion.div
                key={active.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold">{active.name}</h3>
                  <Link href={`/products?category=${active.slug}`} onClick={() => setOpen(false)} className="text-xs font-medium text-primary hover:underline">
                    Shop all {active.name} →
                  </Link>
                </div>
                {active.children.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Browse all products in {active.name}.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
                    {active.children.map((cat) => (
                      <div key={cat.id}>
                        <Link
                          href={`/products?category=${cat.slug}`}
                          onClick={() => setOpen(false)}
                          className="group mb-2 flex items-center gap-2.5"
                        >
                          <Image
                            src={cat.image ?? fallbackImg(cat.slug)}
                            alt=""
                            width={40}
                            height={40}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border transition-transform group-hover:scale-105"
                          />
                          <span className="text-sm font-semibold group-hover:text-primary">{cat.name}</span>
                        </Link>
                        <ul className="space-y-1 pl-0.5">
                          {cat.children.map((sub) => (
                            <li key={sub.id}>
                              <Link
                                href={`/products?category=${sub.slug}`}
                                onClick={() => setOpen(false)}
                                className="block text-sm text-muted-foreground transition-colors hover:translate-x-0.5 hover:text-foreground"
                              >
                                {sub.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Promo image panel */}
              <Link
                href={`/products?category=${active.slug}`}
                onClick={() => setOpen(false)}
                className="relative m-4 hidden w-64 shrink-0 overflow-hidden rounded-xl xl:block"
              >
                <Image
                  src={active.image ?? fallbackImg(active.slug)}
                  alt={active.name}
                  fill
                  sizes="256px"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 p-4 text-white">
                  <p className="text-xs uppercase tracking-wide text-white/80">Featured</p>
                  <p className="text-lg font-bold">Explore {active.name}</p>
                  <span className="mt-2 inline-block rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Shop now</span>
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
