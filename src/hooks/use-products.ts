'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/fetcher';
import type { Paginated, ProductWithRelations } from '@/server/repositories';

export interface ProductFilterState {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: string;
  page: number;
  pageSize: number;
}

function toQueryString(filters: ProductFilterState): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) params.set(key, String(value));
  }
  return params.toString();
}

export function useProducts(filters: ProductFilterState) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () =>
      apiFetch<Paginated<ProductWithRelations>>(`/api/products?${toQueryString(filters)}`),
    placeholderData: keepPreviousData,
  });
}
