import Link from 'next/link';
import { Logo } from '@/components/storefront/logo';

const COLUMNS = [
  { title: 'Shop', links: ['Electronics', 'Fashion', 'Home', 'Beauty'] },
  { title: 'Help', links: ['Track Order', 'Returns', 'Shipping', 'Contact Us'] },
  { title: 'Company', links: ['About', 'Careers', 'Press', 'Sustainability'] },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="container grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
        <div>
          <Logo className="text-2xl" />
          <p className="mt-4 text-sm text-muted-foreground">
            Your everyday marketplace for the things you love.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 text-sm font-semibold">{col.title}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {col.links.map((l) => (
                <li key={l}>
                  <Link href="/products" className="transition-colors hover:text-foreground">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CodShop. Built with Next.js, Prisma & MongoDB.
      </div>
    </footer>
  );
}
