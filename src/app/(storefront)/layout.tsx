import { Navbar } from '@/components/storefront/navbar';
import { Footer } from '@/components/storefront/footer';
import { CartDrawer } from '@/components/storefront/cart-drawer';
import { CartFlyLayer } from '@/components/storefront/cart-fly-layer';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <CartFlyLayer />
    </div>
  );
}
