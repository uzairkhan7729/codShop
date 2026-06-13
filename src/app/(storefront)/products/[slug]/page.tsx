import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/storefront/product-detail';
import { ReviewsSection } from '@/components/storefront/reviews-section';
import { ProductCard, type ProductCardData } from '@/components/storefront/product-card';
import { NotFoundError } from '@/lib/errors';
import { services } from '@/server/services';
import type { ProductDetail as ProductDetailType } from '@/server/services/product.service';

// ISR for product pages (Module 10).
export const revalidate = 300;

async function loadProduct(slug: string): Promise<ProductDetailType | null> {
  try {
    return await services.products.getProductBySlug(slug);
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    return null; // DB unreachable at build → 404 page (regenerated on next request)
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const detail = await loadProduct(params.slug);
  if (!detail) return { title: 'Product not found' };
  const { product } = detail;
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.description.slice(0, 160),
    openGraph: { images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const detail = await loadProduct(params.slug);
  if (!detail) notFound();
  const { product, related } = detail;

  const relatedCards: ProductCardData[] = related.map((p) => ({
    id: p.id, name: p.name, slug: p.slug, price: p.price, comparePrice: p.comparePrice,
    images: p.images, brand: p.brand, stock: p.stock, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
  }));

  return (
    <div className="container py-6">
      <ProductDetail product={product} />
      <ReviewsSection slug={product.slug} productId={product.id} />

      {relatedCards.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">You may also like</h2>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {relatedCards.map((p, i) => (
              <div key={p.id} className="w-44 shrink-0 sm:w-52">
                <ProductCard product={p} index={i} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
