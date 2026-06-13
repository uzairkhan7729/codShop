'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Heart, Loader2, ShoppingCart, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAddToCart } from '@/hooks/use-cart';
import { apiPost } from '@/lib/fetcher';
import { toast } from 'sonner';
import { cn, discountPercent, formatCurrency } from '@/lib/utils';

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  images: string[];
  brand?: string | null;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
}

export function ProductCard({ product, index = 0 }: { product: ProductCardData; index?: number }) {
  const router = useRouter();
  const { status } = useSession();
  const addToCart = useAddToCart();
  const [added, setAdded] = useState(false);
  const [wished, setWished] = useState(false);

  const discount = discountPercent(product.price, product.comparePrice);
  const outOfStock = product.stock <= 0;
  const image = product.images[0] ?? 'https://picsum.photos/seed/placeholder/700/700';

  const handleAdd = (e: React.MouseEvent) => {
    addToCart.mutate(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image,
        price: product.price,
        maxQuantity: product.stock,
        originX: e.clientX,
        originY: e.clientY,
      },
      {
        onSuccess: () => {
          setAdded(true);
          setTimeout(() => setAdded(false), 1200);
        },
      },
    );
  };

  const toggleWish = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status !== 'authenticated') {
      router.push('/login');
      return;
    }
    setWished((w) => !w);
    try {
      await apiPost('/api/wishlist', { productId: product.id });
    } catch {
      setWished((w) => !w);
      toast.error('Could not update wishlist');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.5) }}
      whileHover={{ y: -8 }}
      className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg"
    >
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.08]"
        />
        {discount && (
          <Badge variant="destructive" className="absolute left-2 top-2">
            -{discount}%
          </Badge>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-sm font-semibold">
            Out of stock
          </div>
        )}

        {/* Wishlist heart */}
        <motion.button
          onClick={toggleWish}
          whileTap={{ scale: 0.8 }}
          whileHover={{ scale: 1.15 }}
          aria-label="Add to wishlist"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur"
        >
          <motion.span animate={wished ? { scale: [1, 1.4, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
            <Heart className={cn('h-4 w-4 transition-colors', wished ? 'fill-rose-500 text-rose-500' : 'text-foreground')} />
          </motion.span>
        </motion.button>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
          {product.name}
        </Link>

        <motion.div whileHover={{ scale: 1.08 }} className="mt-1 flex w-fit items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>{product.ratingAvg.toFixed(1)}</span>
          <span>({product.ratingCount})</span>
        </motion.div>

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <p className="text-base font-bold">{formatCurrency(product.price)}</p>
            {product.comparePrice && (
              <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.comparePrice)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Slide-up add-to-cart */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full p-3 transition-transform duration-300 group-hover:translate-y-0">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant={added ? 'default' : 'brand'}
            size="sm"
            className={cn('w-full transition-colors', added && 'bg-green-600 text-white hover:bg-green-600')}
            disabled={outOfStock || addToCart.isPending}
            onClick={handleAdd}
          >
            {addToCart.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</>
            ) : added ? (
              <><Check className="h-4 w-4" /> Added!</>
            ) : (
              <><ShoppingCart className="h-4 w-4" /> Add to cart</>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
