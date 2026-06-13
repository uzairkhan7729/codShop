'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ProductForm, type ProductFormValues } from '@/components/admin/product-form';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/fetcher';
import type { ProductWithRelations } from '@/server/repositories';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  // Reuse the admin list endpoint's shape via a single-product fetch through the
  // public slug API would need a slug; instead fetch via admin list filtered by id is overkill.
  // We fetch the product through the public product API is slug-based, so use a dedicated query:
  const { data, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => apiFetch<ProductWithRelations>(`/api/admin/products/${id}`),
  });

  if (isLoading) return <Skeleton className="h-96 w-full max-w-3xl" />;
  if (!data) return <p className="text-muted-foreground">Product not found.</p>;

  const initial: ProductFormValues = {
    id: data.id,
    name: data.name, slug: data.slug, description: data.description,
    price: data.price, comparePrice: data.comparePrice ?? undefined, sku: data.sku,
    brand: data.brand ?? undefined, images: data.images.length ? data.images : [''],
    categoryId: data.categoryId, stock: data.stock, lowStockThreshold: data.lowStockThreshold,
    isActive: data.isActive, isFeatured: data.isFeatured,
    metaTitle: data.metaTitle ?? undefined, metaDescription: data.metaDescription ?? undefined,
    variants: data.variants.map((v) => ({ sku: v.sku, size: v.size ?? '', color: v.color ?? '', stock: v.stock, price: v.price ?? undefined })),
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit product</h1>
      <ProductForm initial={initial} />
    </div>
  );
}
