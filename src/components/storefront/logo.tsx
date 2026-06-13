import { cn } from '@/lib/utils';

/** CodShop wordmark. `Cod` in brand blue, `Shop` adapts to the surface. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('select-none text-xl font-extrabold tracking-tight', className)}>
      <span className="text-primary">Cod</span>
      <span>Shop</span>
    </span>
  );
}
