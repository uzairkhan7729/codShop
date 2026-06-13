import { cn } from '@/lib/utils';

/** Shimmer skeleton placeholder (Module 8). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton rounded-md', className)} {...props} />;
}

export { Skeleton };
