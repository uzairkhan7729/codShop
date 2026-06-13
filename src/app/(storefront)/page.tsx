import Link from 'next/link';
import Image from 'next/image';
import { HeroCarousel } from '@/components/storefront/hero-carousel';
import { FlashDeals } from '@/components/storefront/flash-deals';
import { ProductCard, type ProductCardData } from '@/components/storefront/product-card';
import { services } from '@/server/services';
import type { ProductWithRelations } from '@/server/repositories';

// ISR: regenerate the homepage every 5 minutes (Module 10).
export const revalidate = 300;

function toCard(p: ProductWithRelations): ProductCardData {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    comparePrice: p.comparePrice,
    images: p.images,
    brand: p.brand,
    stock: p.stock,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
  };
}

/** Resolve a promise to a fallback if the DB is unreachable (keeps ISR builds resilient). */
async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export default async function HomePage() {
  const empty = { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
  const [featured, trending, deals, tree] = await Promise.all([
    safe(services.products.getProducts({ isFeatured: true }, { page: 1, pageSize: 10 }), empty),
    safe(services.products.getProducts({ sort: 'best_selling' }, { page: 1, pageSize: 10 }), empty),
    safe(services.products.getProducts({ sort: 'newest' }, { page: 1, pageSize: 10 }), empty),
    safe(services.categories.getTree(), []),
  ]);

  return (
    <div className="container space-y-10 py-6">
      <HeroCarousel />

      {/* Featured categories */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Shop by category</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-10">
          {tree.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-shadow hover:shadow-md"
            >
              <div className="relative h-14 w-14 overflow-hidden rounded-full bg-muted">
                {cat.image && (
                  <Image src={cat.image} alt={cat.name} fill sizes="56px" className="object-cover transition-transform group-hover:scale-110" />
                )}
              </div>
              <span className="text-xs font-medium">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <FlashDeals products={deals.items.map(toCard)} />

      {/* Trending */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Trending now</h2>
          <Link href="/products?sort=best_selling" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {trending.items.map((p, i) => (
            <ProductCard key={p.id} product={toCard(p)} index={i} />
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.items.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Featured for you</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {featured.items.map((p, i) => (
              <ProductCard key={p.id} product={toCard(p)} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="rounded-xl bg-primary/10 p-8 text-center">
        <h2 className="text-2xl font-bold">Get the best deals first</h2>
        <p className="mt-2 text-muted-foreground">Subscribe to our newsletter for exclusive offers.</p>
        <form className="mx-auto mt-4 flex max-w-md gap-2">
          <input
            type="email"
            required
            placeholder="Enter your email"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            aria-label="Email address"
          />
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
            Subscribe
          </button>
        </form>
      </section>
    </div>
  );
}
