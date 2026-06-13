'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, apiPut } from '@/lib/fetcher';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { Paginated, UserWithCounts } from '@/server/repositories';

export default function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', search, page],
    queryFn: () => apiFetch<Paginated<UserWithCounts>>(`/api/admin/users?search=${encodeURIComponent(search)}&page=${page}&pageSize=15`),
  });

  const toggleBlock = useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) => apiPut(`/api/admin/users/${id}/block`, { blocked }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-customers'] }); toast.success('Customer updated'); },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customers</h1>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name or email…" className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr><th className="p-3">Customer</th><th>Joined</th><th>Orders</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={5} className="p-2"><Skeleton className="h-10 w-full" /></td></tr>)
            ) : (
              data?.items.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-3"><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>{u._count.orders}</td>
                  <td><Badge variant={u.isBlocked ? 'destructive' : 'success'}>{u.isBlocked ? 'Blocked' : 'Active'}</Badge></td>
                  <td className="text-right">
                    <Button variant="outline" size="sm" onClick={() => toggleBlock.mutate({ id: u.id, blocked: !u.isBlocked })}>
                      {u.isBlocked ? 'Unblock' : 'Block'}
                    </Button>
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
