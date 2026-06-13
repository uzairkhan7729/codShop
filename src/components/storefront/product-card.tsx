'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingCart, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAddToCart } from '@/hooks/use-cart';
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
  const addToCart = useAddToCart();
  const discount = discountPercent(product.price, product.comparePrice);
  const outOfStock = product.stock <= 0;
  const image = product.images[0] ?? 'https://picsum.photos/seed/placeholder/700/700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="group relative flex flex-col overflow-hidden rounded-lg border bg-card"
    >
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
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
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
          {product.name}
        </Link>

        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>{product.ratingAvg.toFixed(1)}</span>
          <span>({product.ratingCount})</span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <p className="text-base font-bold">{formatCurrency(product.price)}</p>
            {product.comparePrice && (
              <p className="text-xs text-muted-foreground line-through">
                {formatCurrency(product.comparePrice)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Slide-up add-to-cart */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 translate-y-full p-3 transition-transform duration-300 group-hover:translate-y-0',
        )}
      >
        <Button
          variant="brand"
          size="sm"
          className="w-full"
          disabled={outOfStock || addToCart.isPending}
          onClick={() =>
            addToCart.mutate({
              productId: product.id,
              name: product.name,
              slug: product.slug,
              image,
              price: product.price,
              maxQuantity: product.stock,
            })
          }
        >
          <ShoppingCart className="h-4 w-4" />
          Add to cart
        </Button>
      </div>
    </motion.div>
  );
}
