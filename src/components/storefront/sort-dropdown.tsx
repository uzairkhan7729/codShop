'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SortOption {
  value: string;
  label: string;
}

/** Animated sort dropdown: spring open, staggered options, hover shift-right. */
export function SortDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: SortOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-muted-foreground">Sort:</span>
        <span className="font-medium">{current?.label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            role="listbox"
            className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-lg border bg-popover p-1 shadow-lg"
          >
            {options.map((opt, i) => (
              <motion.li
                key={opt.value}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <motion.button
                  whileHover={{ x: 4 }}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                    opt.value === value && 'font-semibold text-primary',
                  )}
                  role="option"
                  aria-selected={opt.value === value}
                >
                  {opt.label}
                  {opt.value === value && <Check className="h-4 w-4" />}
                </motion.button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
