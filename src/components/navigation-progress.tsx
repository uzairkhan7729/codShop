'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Lightweight top progress bar — gives instant feedback on every internal
 * navigation (App Router waits for server data before swapping pages, so without
 * this a click can feel "dead"). Starts on link click, completes on route change.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const creeper = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCreep = () => {
    if (creeper.current) {
      clearInterval(creeper.current);
      creeper.current = null;
    }
  };

  // Complete the bar whenever the path actually changes.
  useEffect(() => {
    stopCreep();
    setWidth(100);
    const hide = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 300);
    return () => clearTimeout(hide);
  }, [pathname]);

  // Start the bar on internal link clicks.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');
      if (!href || href.startsWith('#') || target === '_blank') return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // same page (e.g. query-only)

      setVisible(true);
      setWidth(8);
      stopCreep();
      // Creep toward 90% so the bar keeps moving during the wait.
      creeper.current = setInterval(() => {
        setWidth((w) => (w < 90 ? w + (90 - w) * 0.15 : w));
      }, 200);
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      stopCreep();
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 bg-transparent">
      <div
        className="h-full bg-primary shadow-[0_0_8px] shadow-primary transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
