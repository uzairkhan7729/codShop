'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, LogOut, Menu, Search, ShoppingCart, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartCount } from '@/hooks/use-cart';
import { Logo } from '@/components/storefront/logo';
import { cn } from '@/lib/utils';

const NAV_CATEGORIES = [
  'Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Books', 'Toys', 'Grocery',
];

export function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const count = useCartCount();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/products?search=${encodeURIComponent(query.trim())}` : '/products');
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Home">
          <Logo className="text-2xl" />
        </Link>

        <form onSubmit={submitSearch} className="relative hidden flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for products, brands and categories"
            className="pl-9"
            aria-label="Search products"
          />
        </form>

        <nav className="flex items-center gap-1">
          <Link href="/account/wishlist" aria-label="Wishlist">
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
              <Heart className="h-5 w-5" />
            </Button>
          </Link>

          <Link href="/cart" aria-label={`Cart with ${count} items`} className="relative">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-1">
              {session.user.role === 'ADMIN' && (
                <Link href="/admin/dashboard">
                  <Button variant="ghost" size="sm">Admin</Button>
                </Link>
              )}
              <Link href="/account">
                <Button variant="ghost" size="icon" aria-label="Account">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Sign out">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </nav>
      </div>

      {/* Category strip */}
      <div className="border-t bg-muted/40">
        <div className="container no-scrollbar flex items-center gap-1 overflow-x-auto py-2">
          {NAV_CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/products?category=${c.toLowerCase()}`}
              className="whitespace-nowrap rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              {c}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn('overflow-hidden border-t md:hidden')}
          >
            <form onSubmit={submitSearch} className="container py-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products"
                aria-label="Search products"
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
