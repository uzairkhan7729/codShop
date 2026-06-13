import type { OrderStatus } from '@prisma/client';
import { Badge, type BadgeProps } from '@/components/ui/badge';

const MAP: Record<OrderStatus, { variant: BadgeProps['variant']; label: string }> = {
  PENDING: { variant: 'warning', label: 'Pending' },
  PAID: { variant: 'default', label: 'Paid' },
  PROCESSING: { variant: 'secondary', label: 'Processing' },
  SHIPPED: { variant: 'default', label: 'Shipped' },
  DELIVERED: { variant: 'success', label: 'Delivered' },
  CANCELLED: { variant: 'destructive', label: 'Cancelled' },
  REFUNDED: { variant: 'outline', label: 'Refunded' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = MAP[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
