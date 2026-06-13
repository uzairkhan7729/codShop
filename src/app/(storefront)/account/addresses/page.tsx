'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import type { Address } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiDelete, apiFetch, apiPost, FetchError } from '@/lib/fetcher';
import { CountrySelect, PhoneInput } from '@/components/address-fields';
import { toast } from 'sonner';

const EMPTY = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US', isDefault: false };

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiFetch<Address[]>('/api/account/addresses'),
  });

  const create = useMutation({
    mutationFn: () => apiPost('/api/account/addresses', { ...form, type: 'SHIPPING' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowForm(false); setForm(EMPTY);
      toast.success('Address added');
    },
    onError: (err) => toast.error(err instanceof FetchError ? err.message : 'Could not add address'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/account/addresses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address removed'); },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Addresses</h1>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}><Plus className="h-4 w-4" /> Add address</Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
            className="mb-6 grid grid-cols-2 gap-3 overflow-hidden rounded-lg border p-4"
          >
            {([
              ['fullName', 'Full name'], ['line1', 'Address line 1'], ['line2', 'Address line 2'],
              ['city', 'City'], ['state', 'State'], ['postalCode', 'Postal code'],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <PhoneInput value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <CountrySelect value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
              Set as default
            </label>
            <Button type="submit" className="col-span-2 justify-self-start" disabled={create.isPending}>Save address</Button>
          </motion.form>
        )}
      </AnimatePresence>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !addresses || addresses.length === 0 ? (
        <p className="text-muted-foreground">No saved addresses yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="relative rounded-lg border p-4 text-sm">
              {a.isDefault && <span className="absolute right-3 top-3 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Default</span>}
              <p className="font-medium">{a.fullName}</p>
              <p className="text-muted-foreground">{a.phone}</p>
              <p className="text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}, {a.country}</p>
              <button onClick={() => remove.mutate(a.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
