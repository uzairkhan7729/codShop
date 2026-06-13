import { prisma } from '@/lib/prisma';

export interface RevenuePoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface StatusBucket {
  status: string;
  count: number;
}

/**
 * IAnalyticsRepository — read-only aggregations for the admin dashboard.
 * "Paid" revenue counts orders past the PENDING/CANCELLED states.
 */
export interface IAnalyticsRepository {
  totals(): Promise<{ revenue: number; orders: number; paidOrders: number }>;
  revenueSeries(days: number): Promise<RevenuePoint[]>;
  topProducts(limit: number): Promise<TopProduct[]>;
  statusDistribution(): Promise<StatusBucket[]>;
}

const REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

export class AnalyticsRepository implements IAnalyticsRepository {
  async totals(): Promise<{ revenue: number; orders: number; paidOrders: number }> {
    const [agg, orders] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: [...REVENUE_STATUSES] } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.count(),
    ]);
    return {
      revenue: Math.round((agg._sum.total ?? 0) * 100) / 100,
      orders,
      paidOrders: agg._count,
    };
  }

  async revenueSeries(days: number): Promise<RevenuePoint[]> {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const orders = await prisma.order.findMany({
      where: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: since } },
      select: { createdAt: true, total: true },
    });

    const buckets = new Map<string, { revenue: number; orders: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      buckets.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
    }
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const b = buckets.get(key);
      if (b) {
        b.revenue = Math.round((b.revenue + o.total) * 100) / 100;
        b.orders += 1;
      }
    }
    return Array.from(buckets.entries()).map(([date, v]) => ({ date, ...v }));
  }

  async topProducts(limit: number): Promise<TopProduct[]> {
    const grouped = await prisma.orderItem.groupBy({
      by: ['productId', 'name'],
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });
    return grouped.map((g) => ({
      productId: g.productId,
      name: g.name,
      quantity: g._sum.quantity ?? 0,
      revenue: Math.round((g._sum.total ?? 0) * 100) / 100,
    }));
  }

  async statusDistribution(): Promise<StatusBucket[]> {
    const grouped = await prisma.order.groupBy({ by: ['status'], _count: true });
    return grouped.map((g) => ({ status: g.status, count: g._count }));
  }
}
