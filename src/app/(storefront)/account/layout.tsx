'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { Heart, MapPin, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/account', label: 'Profile', icon: User },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=/account');
  }, [status, router]);

  if (status !== 'authenticated') {
    return <div className="container py-10 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="container grid grid-cols-1 gap-6 py-6 md:grid-cols-[220px_1fr]">
      <aside className="space-y-1">
        <h2 className="mb-3 px-2 text-lg font-bold">My account</h2>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          );
        })}
      </aside>
      <div>{children}</div>
    </div>
  );
}
