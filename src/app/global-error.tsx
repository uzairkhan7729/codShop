'use client';

/** Root error boundary (catches errors in the root layout itself). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Application error</h1>
        <p style={{ color: '#666', maxWidth: 420 }}>A critical error occurred. Please reload the page.</p>
        <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 8, background: '#3866df', color: '#fff', border: 0 }}>
          Reload
        </button>
      </body>
    </html>
  );
}
