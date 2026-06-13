'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/** Route-segment error boundary (Module 12). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Hook for Sentry/Logtail — wired here when DSN is configured.
    // eslint-disable-next-line no-console
    console.error('[boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        An unexpected error occurred. You can try again, or head back to the homepage.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>Go home</Button>
      </div>
    </div>
  );
}
