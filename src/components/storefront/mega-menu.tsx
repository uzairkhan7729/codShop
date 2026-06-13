'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { apiFetch } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import type { MegaCategory } from '@/server/repositories';

/** Amazon-style 3-level mega menu: Department -> Category -> Subcategory. */
export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['categories', 'mega'],
    queryFn: () => apiFetch<MegaCategory[]>('/api/categories?mega=true'),
    staleTime: 10 * 60 * 1000,
  });

  const depts = data ?? [];
  const active = depts.find((d) => d.id === activeId) ?? depts[0];

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-background"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <LayoutGrid className="h-4 w-4" />
        All Categories
      </button>

      <AnimatePresence>
        {open && depts.length > 0 && active && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 top-full z-50 flex w-[800px] max-w-[92vw] overflow-hidden rounded-b-xl border bg-popover shadow-2xl"
          >
            {/* Departments rail */}
            <ul className="w-56 shrink-0 border-r bg-muted/30 p-2">
              {depts.map((dept) => (
                <li key={dept.id}>
                  <Link
                    href={`/products?category=${dept.slug}`}
                    onMouseEnter={() => setActiveId(dept.id)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                      active.id === dept.id ? 'bg-background font-semibold text-primary shadow-sm' : 'hover:bg-background',
                    )}
                  >
                    {dept.name}
                    <ChevronRight className="h-4 w-4 opacity-60" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Active department panel */}
            <motion.div
              key={active.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold">{active.name}</h3>
                <Link href={`/products?category=${active.slug}`} onClick={() => setOpen(false)} className="text-xs font-medium text-primary hover:underline">
                  Shop all {active.name}
                </Link>
              </div>

              {active.children.length === 0 ? (
                <p className="text-sm text-muted-foreground">Browse all products in {active.name}.</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
                  {active.children.map((cat) => (
                    <div key={cat.id}>
                      <Link
                        href={`/products?category=${cat.slug}`}
                        onClick={() => setOpen(false)}
                        className="mb-1.5 block text-sm font-semibold hover:text-primary"
                      >
                        {cat.name}
                      </Link>
                      <ul className="space-y-1">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
