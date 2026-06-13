import { cn } from '@/lib/utils';

/**
 * CodShop wordmark. `Cod` in a golden-amber that matches the yellow brand
 * buttons (readable on light/dark, unlike pure accent yellow); `Shop` adapts
 * to the surface.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('select-none text-xl font-extrabold tracking-tight', className)}>
      <span className="text-amber-400 [text-shadow:0_1px_0_rgba(0,0,0,0.15)]">Cod</span>
      <span>Shop</span>
    </span>
  );
}
