'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import type { Category } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch, apiPost, apiPut, FetchError } from '@/lib/fetcher';
import { toast } from 'sonner';

interface VariantDraft { sku: string; size: string; color: string; stock: number; price?: number }

export interface ProductFormValues {
  id?: string;
  name: string; slug: string; description: string;
  price: number; comparePrice?: number; sku: string; brand?: string;
  images: string[]; categoryId: string; stock: number; lowStockThreshold: number;
  isActive: boolean; isFeatured: boolean; metaTitle?: string; metaDescription?: string;
  variants: VariantDraft[];
}

const BLANK: ProductFormValues = {
  name: '', slug: '', description: '', price: 0, sku: '', images: [''], categoryId: '',
  stock: 0, lowStockThreshold: 5, isActive: true, isFeatured: false, variants: [],
};

export function ProductForm({ initial }: { initial?: ProductFormValues }) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(initial ?? BLANK);
  const [saving, setSaving] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<Category[]>('/api/categories'),
  });

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const autoSlug = (name: string) => {
    set('name', name);
    if (!initial) set('slug', name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold),
      images: form.images.filter(Boolean),
      variants: form.variants.length
        ? form.variants.map((v) => ({ ...v, stock: Number(v.stock), price: v.price ? Number(v.price) : undefined }))
        : undefined,
    };
    try {
      if (initial?.id) await apiPut(`/api/admin/products/${initial.id}`, payload);
      else await apiPost('/api/admin/products', payload);
      toast.success(initial ? 'Product updated' : 'Product created');
      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof FetchError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <section className="space-y-4 rounded-lg border p-5">
        <h2 className="font-semibold">Basic info</h2>
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => autoSlug(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Slug</Label><Input value={form.slug} onChange={(e) => set('slug', e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>SKU</Label><Input value={form.sku} onChange={(e) => set('sku', e.target.value)} required /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} required className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5"><Label>Price</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => set('price', Number(e.target.value))} required /></div>
          <div className="space-y-1.5"><Label>Compare price</Label><Input type="number" step="0.01" value={form.comparePrice ?? ''} onChange={(e) => set('comparePrice', Number(e.target.value))} /></div>
          <div className="space-y-1.5"><Label>Brand</Label><Input value={form.brand ?? ''} onChange={(e) => set('brand', e.target.value)} /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">Select category…</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border p-5">
        <h2 className="font-semibold">Media (image URLs)</h2>
        {form.images.map((url, i) => (
          <div key={i} className="flex gap-2">
            <Input value={url} placeholder="https://…" onChange={(e) => set('images', form.images.map((u, j) => (j === i ? e.target.value : u)))} />
            <Button type="button" variant="ghost" size="icon" onClick={() => set('images', form.images.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => set('images', [...form.images, ''])}>+ Add image</Button>
      </section>

      <section className="grid grid-cols-2 gap-4 rounded-lg border p-5">
        <h2 className="col-span-2 font-semibold">Inventory</h2>
        <div className="space-y-1.5"><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => set('stock', Number(e.target.value))} /></div>
        <div className="space-y-1.5"><Label>Low stock threshold</Label><Input type="number" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', Number(e.target.value))} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} /> Featured</label>
      </section>

      <section className="space-y-4 rounded-lg border p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Variants</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => set('variants', [...form.variants, { sku: '', size: '', color: '', stock: 0 }])}>+ Add variant</Button>
        </div>
        {form.variants.map((v, i) => (
          <div key={i} className="grid grid-cols-4 gap-2">
            <Input placeholder="SKU" value={v.sku} onChange={(e) => set('variants', form.variants.map((x, j) => (j === i ? { ...x, sku: e.target.value } : x)))} />
            <Input placeholder="Size" value={v.size} onChange={(e) => set('variants', form.variants.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))} />
            <Input placeholder="Color" value={v.color} onChange={(e) => set('variants', form.variants.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} />
            <Input type="number" placeholder="Stock" value={v.stock} onChange={(e) => set('variants', form.variants.map((x, j) => (j === i ? { ...x, stock: Number(e.target.value) } : x)))} />
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-lg border p-5">
        <h2 className="font-semibold">SEO</h2>
        <div className="space-y-1.5"><Label>Meta title</Label><Input value={form.metaTitle ?? ''} onChange={(e) => set('metaTitle', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Meta description</Label><Input value={form.metaDescription ?? ''} onChange={(e) => set('metaDescription', e.target.value)} /></div>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : initial ? 'Update product' : 'Create product'}</Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>Cancel</Button>
      </div>
    </form>
  );
}
