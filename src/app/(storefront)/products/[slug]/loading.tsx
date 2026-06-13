import { Skeleton } from '@/components/ui/skeleton';

/** Shown instantly on navigation to a product while its data loads. */
export default function ProductLoading() {
  return (
    <div className="container py-6">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-md" />
            ))}
          </div>
        </div>
        {/* Info */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-24" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-16" />
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 flex-1" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
