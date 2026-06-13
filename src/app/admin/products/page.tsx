'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiDelete, apiFetch } from '@/lib/fetcher';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { Paginated, ProductWithRelations } from '@/server/repositories';

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', search, page],
    queryFn: () => apiFetch<Paginated<ProductWithRelations>>(`/api/admin/products?search=${encodeURIComponent(search)}&page=${page}&pageSize=15`),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product deleted'); },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new"><Button><Plus className="h-4 w-4" /> New product</Button></Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search products…" className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr><th className="p-3">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={6} className="p-2"><Skeleton className="h-10 w-full" /></td></tr>)
            ) : (
              data?.items.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="40px" className="object-cover" />}
                      </div>
                      <span className="line-clamp-1 font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td>{p.category.name}</td>
                  <td>{formatCurrency(p.price)}</td>
                  <td className={p.stock === 0 ? 'text-destructive' : p.stock <= p.lowStockThreshold ? 'text-amber-600' : ''}>{p.stock}</td>
                  <td><Badge variant={p.isActive ? 'success' : 'secondary'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/products/${p.id}/edit`}><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></Link>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete this product?')) del.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
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
    </div>
  );
}
