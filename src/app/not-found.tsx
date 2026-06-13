import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/storefront/logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo className="text-3xl" />
      <h1 className="text-6xl font-extrabold">404</h1>
      <p className="text-muted-foreground">We couldn&apos;t find the page you&apos;re looking for.</p>
      <Link href="/"><Button variant="brand">Back to shopping</Button></Link>
    </div>
  );
}
