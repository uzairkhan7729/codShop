'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, apiPut } from '@/lib/fetcher';
import { toast } from 'sonner';
import type { Paginated, ProductWithRelations } from '@/server/repositories';

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-inventory', page],
    queryFn: () => apiFetch<Paginated<ProductWithRelations>>(`/api/admin/products?page=${page}&pageSize=20&sort=newest`),
  });

  const update = useMutation({
    mutationFn: ({ productId, stock }: { productId: string; stock: number }) => apiPut('/api/admin/inventory', { productId, stock }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-inventory'] }); toast.success('Stock updated'); },
    onError: () => toast.error('Update failed'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Inventory</h1>
      <p className="text-sm text-muted-foreground">Adjust stock levels. Low-stock rows are highlighted.</p>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr><th className="p-3">Product</th><th>SKU</th><th>Current</th><th>New stock</th><th className="text-right">Save</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={5} className="p-2"><Skeleton className="h-9 w-full" /></td></tr>)
            ) : (
              data?.items.map((p) => {
                const low = p.stock <= p.lowStockThreshold;
                return (
                  <tr key={p.id} className={`border-b last:border-0 ${low ? 'bg-amber-50' : ''}`}>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="text-muted-foreground">{p.sku}</td>
                    <td className={low ? 'font-semibold text-amber-700' : ''}>{p.stock}</td>
                    <td>
                      <Input type="number" defaultValue={p.stock} className="h-8 w-24" onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: Number(e.target.value) }))} />
                    </td>
                    <td className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => update.mutate({ productId: p.id, stock: drafts[p.id] ?? p.stock })}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
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
    </div>
  );
}
