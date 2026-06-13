'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import type { Coupon } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { apiDelete, apiFetch, apiPost, apiPut, FetchError } from '@/lib/fetcher';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { Paginated } from '@/server/repositories';

const BLANK = { code: '', type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED', value: 10, minPurchase: 0, usageLimitPerUser: 1 };

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => apiFetch<Paginated<Coupon>>('/api/admin/coupons?pageSize=50'),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });

  const create = useMutation({
    mutationFn: () => apiPost('/api/admin/coupons', form),
    onSuccess: () => { refresh(); setShowForm(false); setForm(BLANK); toast.success('Coupon created'); },
    onError: (err) => toast.error(err instanceof FetchError ? err.message : 'Create failed'),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiPut(`/api/admin/coupons/${id}`, { isActive }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/coupons/${id}`),
    onSuccess: () => { refresh(); toast.success('Coupon deleted'); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <Button onClick={() => setShowForm((s) => !s)}><Plus className="h-4 w-4" /> New coupon</Button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="grid grid-cols-2 gap-3 rounded-lg border p-4 md:grid-cols-5">
          <div className="space-y-1.5"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} required /></div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'PERCENTAGE' | 'FIXED' }))} className="h-10 w-full rounded-md border bg-background px-2 text-sm">
              <option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label>Value</Label><Input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} /></div>
          <div className="space-y-1.5"><Label>Min purchase</Label><Input type="number" value={form.minPurchase} onChange={(e) => setForm((f) => ({ ...f, minPurchase: Number(e.target.value) }))} /></div>
          <div className="flex items-end"><Button type="submit" className="w-full" disabled={create.isPending}>Create</Button></div>
        </form>
      )}

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr><th className="p-3">Code</th><th>Type</th><th>Value</th><th>Used</th><th>Expires</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={7} className="p-2"><Skeleton className="h-9 w-full" /></td></tr>)
            ) : (
              data?.items.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-3 font-mono font-semibold">{c.code}</td>
                  <td>{c.type}</td>
                  <td>{c.type === 'PERCENTAGE' ? `${c.value}%` : c.value}</td>
                  <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                  <td>{c.expiresAt ? formatDate(c.expiresAt) : '—'}</td>
                  <td><button onClick={() => toggle.mutate({ id: c.id, isActive: !c.isActive })}><Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></button></td>
                  <td className="text-right"><Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete coupon?')) remove.mutate(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
