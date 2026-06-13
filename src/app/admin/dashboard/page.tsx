'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { DollarSign, Package, ShoppingCart, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/fetcher';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DashboardStats } from '@/server/services/analytics.service';

// Charts pull in Recharts (heavy) — load them lazily so the KPIs + tables
// render immediately and the chart bundle streams in behind a skeleton.
const DashboardCharts = dynamic(() => import('@/components/admin/dashboard-charts'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Skeleton className="h-80 rounded-lg lg:col-span-2" />
      <Skeleton className="h-80 rounded-lg" />
    </div>
  ),
});

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiFetch<DashboardStats>('/api/admin/dashboard/stats'),
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-muted-foreground">Couldn&apos;t load dashboard data.</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const kpis = [
    { label: 'Revenue', value: formatCurrency(data.revenue), icon: DollarSign, color: 'text-green-600' },
    { label: 'Orders', value: data.orders.toLocaleString(), icon: ShoppingCart, color: 'text-blue-600' },
    { label: 'Customers', value: data.customers.toLocaleString(), icon: Users, color: 'text-purple-600' },
    { label: 'Conversion', value: `${data.conversionRate}%`, icon: Package, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <DashboardCharts data={data} />

      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4 font-semibold">Recent orders</div>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2">Order</th><th>Customer</th><th>Date</th><th>Status</th><th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2"><Link href="/admin/orders" className="font-medium text-primary">{o.orderNumber}</Link></td>
                    <td>{o.user.name}</td>
                    <td>{formatDate(o.createdAt)}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td className="text-right">{formatCurrency(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
