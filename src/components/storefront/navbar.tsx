'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { Heart, LogOut, MapPin, Menu, Search, ShoppingCart, Truck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartCount } from '@/hooks/use-cart';
import { useCartUI } from '@/stores/cart-ui-store';
import { Logo } from '@/components/storefront/logo';
import { CategoryBar } from '@/components/storefront/category-bar';
import { cn } from '@/lib/utils';

export function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const rawCount = useCartCount();
  const { openDrawer, pulse } = useCartUI();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cartControls = useAnimationControls();

  // The cart count derives from localStorage (guest) which is unavailable during
  // SSR — gate it behind mount to avoid a hydration mismatch on the badge.
  useEffect(() => setMounted(true), []);
  const count = mounted ? rawCount : 0;

  // Bounce the cart icon whenever an item is added (pulse increments).
  useEffect(() => {
    if (pulse === 0) return;
    cartControls.start({ scale: [1, 1.35, 0.9, 1], rotate: [0, -10, 8, 0], transition: { duration: 0.5 } });
  }, [pulse, cartControls]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/products?search=${encodeURIComponent(query.trim())}` : '/products');
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Top utility strip */}
      <div className="bg-primary text-primary-foreground">
        <div className="container flex h-8 items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Deliver to United States
          </span>
          <span className="hidden items-center gap-1.5 font-medium sm:flex">
            <Truck className="h-3.5 w-3.5" /> Free shipping on orders over $200 · 30-day easy returns
          </span>
          <div className="flex items-center gap-4">
            <Link href="/track" className="hover:underline">Track Order</Link>
            <Link href="/products" className="hidden hover:underline sm:inline">Help</Link>
            <Link href="/admin/dashboard" className="hidden hover:underline md:inline">Sell on CodShop</Link>
          </div>
        </div>
      </div>

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

          <motion.button
            id="cart-icon"
            animate={cartControls}
            onClick={openDrawer}
            aria-label={`Open cart, ${count} items`}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
          >
            <ShoppingCart className="h-5 w-5" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0, y: -4 }}
                  animate={{ scale: [0, 1.4, 1], y: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

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

      {/* Category bar + shared mega flyout (hover All Categories or any department) */}
      <CategoryBar />

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
