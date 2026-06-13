'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/storefront/logo';
import {
  BarChart3, Boxes, LayoutDashboard, LogOut, Package, ShoppingCart, Tag, Users, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex">
        <Link href="/admin/dashboard" className="flex h-16 items-center gap-2 border-b px-6">
          <Logo className="text-lg" />
          <span className="text-sm font-semibold text-muted-foreground">Admin</span>
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <Link href="/" className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted">← Back to store</Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
          <div className="flex gap-1 overflow-x-auto md:hidden">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={cn('rounded-md p-2', pathname.startsWith(item.href) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                <item.icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session?.user?.name}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {session?.user?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <button onClick={() => signOut({ callbackUrl: '/' })} aria-label="Sign out" className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 p-4 md:p-6">
          {children}
        </motion.main>
      </div>
    </div>
  );
}
