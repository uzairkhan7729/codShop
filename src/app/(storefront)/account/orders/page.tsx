'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronRight, Package } from 'lucide-react';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/fetcher';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Paginated, OrderWithRelations } from '@/server/repositories';

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => apiFetch<Paginated<OrderWithRelations>>('/api/orders?pageSize=20'),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My orders</h1>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Package className="h-12 w-12" />
          <p>You haven&apos;t placed any orders yet.</p>
          <Link href="/products" className="text-primary hover:underline">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((order, i) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Link href={`/account/orders/${order.id}`} className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(order.createdAt)} · {order.items.length} item(s) · {formatCurrency(order.total)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
