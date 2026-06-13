'use client';

import { motion } from 'framer-motion';

/**
 * Page transition (Module 8). `template.tsx` re-mounts on every navigation, so
 * each new page fades in and slides up. Respects reduced-motion via Framer.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
