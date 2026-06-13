'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Top progress bar — instant feedback on every internal navigation. The App
 * Router waits for the destination's server data before swapping pages, so
 * without this a click can feel "dead". Starts on link click, creeps while
 * waiting, and completes on route change.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(false);
  const creeper = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCreep = () => {
    if (creeper.current) clearInterval(creeper.current);
    creeper.current = null;
  };

  const start = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    stopCreep();
    setActive(true);
    setWidth(15);
    creeper.current = setInterval(() => {
      setWidth((w) => (w < 90 ? w + Math.max(0.5, (90 - w) * 0.12) : w));
    }, 160);
  };

  // Complete whenever the path changes (navigation finished).
  useEffect(() => {
    stopCreep();
    setWidth(100);
    hideTimer.current = setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 350);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.getAttribute('target') === '_blank') return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    // Capture phase so we run before Next intercepts the click.
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      stopCreep();
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-1"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 250ms' }}
    >
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-primary to-amber-400"
        style={{
          width: `${width}%`,
          boxShadow: '0 0 10px 1px hsl(var(--primary))',
          transition: 'width 180ms ease-out',
        }}
      />
    </div>
  );
}
