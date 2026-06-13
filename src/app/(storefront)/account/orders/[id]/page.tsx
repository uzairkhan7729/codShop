'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Truck } from 'lucide-react';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/fetcher';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { OrderWithRelations } from '@/server/repositories';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => apiFetch<OrderWithRelations>(`/api/orders/${id}`),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!order) return <p className="text-muted-foreground">Order not found.</p>;

  return (
    <div>
      <Link href="/account/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <a href={`/api/orders/${order.id}/invoice`}>
            <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Invoice</Button>
          </a>
        </div>
      </div>

      {order.trackingNumber && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <Truck className="h-4 w-4 text-primary" />
          <span>Tracking: <strong>{order.trackingNumber}</strong>{order.carrier && ` via ${order.carrier}`}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-lg border p-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.image && <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />}
              </div>
              <div className="flex flex-1 justify-between">
                <div>
                  <p className="line-clamp-1 font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qty {item.quantity} · {formatCurrency(item.price)}</p>
                </div>
                <span className="font-semibold">{formatCurrency(item.total)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="h-fit space-y-4">
          <div className="space-y-1 rounded-lg border p-4 text-sm">
            <h2 className="mb-2 font-semibold">Summary</h2>
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(order.tax)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{order.shippingCost === 0 ? 'Free' : formatCurrency(order.shippingCost)}</span></div>
            <div className="mt-1 flex justify-between border-t pt-1 font-bold"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <h2 className="mb-2 font-semibold">Shipping address</h2>
            <p>{order.shippingAddress.fullName}</p>
            <p className="text-muted-foreground">{order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
            <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
