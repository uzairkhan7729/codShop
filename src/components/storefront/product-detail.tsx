'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Minus, Plus, ShoppingCart, Star, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAddToCart } from '@/hooks/use-cart';
import { apiPost } from '@/lib/fetcher';
import { toast } from 'sonner';
import { cn, discountPercent, formatCurrency } from '@/lib/utils';
import type { ProductWithRelations } from '@/server/repositories';

export function ProductDetail({ product }: { product: ProductWithRelations }) {
  const router = useRouter();
  const { status } = useSession();
  const addToCart = useAddToCart();

  const [activeImage, setActiveImage] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const price = variant?.price ?? product.price;
  const stock = variant ? variant.stock : product.stock;
  const discount = discountPercent(price, product.comparePrice);
  const images = product.images.length ? product.images : ['https://picsum.photos/seed/p/700/700'];

  const stockLabel =
    stock <= 0 ? { text: 'Out of stock', variant: 'destructive' as const }
    : stock <= product.lowStockThreshold ? { text: `Only ${stock} left`, variant: 'warning' as const }
    : { text: 'In stock', variant: 'success' as const };

  const add = (e: React.MouseEvent) =>
    addToCart.mutate({
      productId: product.id,
      variantId,
      quantity,
      name: product.name,
      slug: product.slug,
      image: images[activeImage] ?? images[0]!,
      price,
      maxQuantity: stock,
      originX: e.clientX,
      originY: e.clientY,
    });

  const buyNow = async () => {
    if (status !== 'authenticated') {
      router.push(`/login?callbackUrl=/products/${product.slug}`);
      return;
    }
    try {
      await apiPost('/api/cart/items', { productId: product.id, variantId, quantity });
      router.push('/checkout');
    } catch {
      toast.error('Could not start checkout');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {/* Gallery */}
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeImage}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
            >
              <Image src={images[activeImage]!} alt={product.name} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" priority />
            </motion.div>
          </AnimatePresence>
          {discount && <Badge variant="destructive" className="absolute left-3 top-3">-{discount}%</Badge>}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(i)}
              className={cn('relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2', i === activeImage ? 'border-primary' : 'border-transparent')}
              aria-label={`View image ${i + 1}`}
            >
              <Image src={img} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Info + purchase */}
      <div className="space-y-4">
        {product.brand && <p className="text-sm text-muted-foreground">{product.brand}</p>}
        <h1 className="text-2xl font-bold md:text-3xl">{product.name}</h1>

        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn('h-4 w-4', i < Math.round(product.ratingAvg) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
            ))}
          </span>
          <span className="text-muted-foreground">{product.ratingAvg.toFixed(1)} ({product.ratingCount} reviews)</span>
        </div>

        <div className="flex items-end gap-3">
          <span className="text-3xl font-extrabold">{formatCurrency(price)}</span>
          {product.comparePrice && (
            <span className="pb-1 text-lg text-muted-foreground line-through">{formatCurrency(product.comparePrice)}</span>
          )}
        </div>

        <Badge variant={stockLabel.variant}>{stockLabel.text}</Badge>

        {/* Variants */}
        {product.variants.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Options</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { setVariantId(v.id); setQuantity(1); }}
                  disabled={v.stock <= 0}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-40',
                    v.id === variantId ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary',
                  )}
                >
                  {[v.size, v.color].filter(Boolean).join(' / ') || v.sku}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Quantity</span>
          <div className="flex items-center rounded-md border">
            <motion.button whileTap={{ scale: 0.85 }} className="px-3 py-2" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease">
              <Minus className="h-4 w-4" />
            </motion.button>
            <span className="w-10 text-center text-sm">{quantity}</span>
            <motion.button whileTap={{ scale: 0.85 }} className="px-3 py-2" onClick={() => setQuantity((q) => Math.min(stock, q + 1))} aria-label="Increase">
              <Plus className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
            <Button className="w-full" size="lg" disabled={stock <= 0 || addToCart.isPending} onClick={add}>
              <ShoppingCart className="h-5 w-5" /> Add to cart
            </Button>
          </motion.div>
          <Button variant="brand" size="lg" className="flex-1" disabled={stock <= 0} onClick={buyNow}>
            Buy now
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            aria-label="Add to wishlist"
            onClick={async () => {
              if (status !== 'authenticated') { router.push('/login'); return; }
              await apiPost('/api/wishlist', { productId: product.id });
              toast.success('Wishlist updated');
            }}
          >
            <Heart className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
          <Truck className="h-4 w-4 text-primary" />
          <span>Free delivery on orders over {formatCurrency(200)} · Estimated 2–4 business days</span>
        </div>

        <div className="prose prose-sm max-w-none pt-2 text-muted-foreground">
          <h3 className="text-sm font-semibold text-foreground">Description</h3>
          <p>{product.description}</p>
        </div>
      </div>
    </div>
  );
}
