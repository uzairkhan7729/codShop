'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import type { OrderStatus } from '@prisma/client';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, apiPost, apiPut, FetchError } from '@/lib/fetcher';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import type { OrderWithRelations, Paginated } from '@/server/repositories';

const STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OrderWithRelations | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', search, status, page],
    queryFn: () => apiFetch<Paginated<OrderWithRelations>>(
      `/api/admin/orders?search=${encodeURIComponent(search)}&${status ? `status=${status}&` : ''}page=${page}&pageSize=15`,
    ),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Order # or customer…" className="pl-9" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value as OrderStatus | ''); setPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr><th className="p-3">Order</th><th>Customer</th><th>Date</th><th>Status</th><th className="text-right">Total</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={5} className="p-2"><Skeleton className="h-10 w-full" /></td></tr>)
            ) : (
              data?.items.map((o) => (
                <tr key={o.id} onClick={() => setSelected(o)} className="cursor-pointer border-b last:border-0 hover:bg-muted/40">
                  <td className="p-3 font-medium text-primary">{o.orderNumber}</td>
                  <td>{o.user.name}<br /><span className="text-xs text-muted-foreground">{o.user.email}</span></td>
                  <td>{formatDateTime(o.createdAt)}</td>
                  <td><OrderStatusBadge status={o.status} /></td>
                  <td className="text-right">{formatCurrency(o.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="self-center text-sm text-muted-foreground">{page} / {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <AnimatePresence>
        {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} onChanged={() => { refresh(); setSelected(null); }} />}
      </AnimatePresence>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onChanged }: { order: OrderWithRelations; onClose: () => void; onChanged: () => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [tracking, setTracking] = useState(order.trackingNumber ?? '');
  const [carrier, setCarrier] = useState(order.carrier ?? '');

  const updateStatus = useMutation({
    mutationFn: () => apiPut(`/api/admin/orders/${order.id}/status`, { status, trackingNumber: tracking || undefined, carrier: carrier || undefined }),
    onSuccess: () => { toast.success('Order updated'); onChanged(); },
    onError: (err) => toast.error(err instanceof FetchError ? err.message : 'Update failed'),
  });

  const refund = useMutation({
    mutationFn: () => apiPost(`/api/admin/orders/${order.id}/refund`, {}),
    onSuccess: () => { toast.success('Refund issued'); onChanged(); },
    onError: (err) => toast.error(err instanceof FetchError ? err.message : 'Refund failed'),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{order.orderNumber}</h2>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground">Customer</p><p className="font-medium">{order.user.name}</p><p>{order.user.email}</p></div>
          <div><p className="text-muted-foreground">Ship to</p><p>{order.shippingAddress.fullName}</p><p>{order.shippingAddress.line1}, {order.shippingAddress.city}</p></div>
        </div>

        <div className="mb-4 space-y-2">
          {order.items.map((it) => (
            <div key={it.id} className="flex justify-between text-sm">
              <span>{it.name} ×{it.quantity}</span><span>{formatCurrency(it.total)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div className="grid grid-cols-3 gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className="h-9 rounded-md border bg-background px-2 text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Input placeholder="Tracking #" value={tracking} onChange={(e) => setTracking(e.target.value)} className="h-9" />
            <Input placeholder="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="h-9" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => updateStatus.mutate()} disabled={updateStatus.isPending}>Update status</Button>
            <Button size="sm" variant="destructive" onClick={() => { if (confirm('Refund this order?')) refund.mutate(); }} disabled={refund.isPending}>Refund</Button>
            <a href={`/api/orders/${order.id}/invoice`} className="ml-auto"><Button size="sm" variant="outline">Print invoice</Button></a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
