import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="rounded-md bg-accent px-3 py-1 text-2xl font-extrabold text-accent-foreground">noon</span>
      <h1 className="text-6xl font-extrabold">404</h1>
      <p className="text-muted-foreground">We couldn&apos;t find the page you&apos;re looking for.</p>
      <Link href="/"><Button variant="brand">Back to shopping</Button></Link>
    </div>
  );
}
