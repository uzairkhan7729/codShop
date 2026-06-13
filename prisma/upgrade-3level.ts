/**
 * One-time, idempotent upgrade: add a 3rd category level (subcategories) under
 * existing 2nd-level categories and remap products onto the new leaves.
 * Non-destructive — users, orders, reviews are untouched.
 *
 * Run: node prisma/upgrade-3level.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUBCATS: Record<string, string[]> = {
  Mobiles: ['Smartphones', 'Feature Phones', 'Mobile Accessories'],
  Laptops: ['Ultrabooks', 'Gaming Laptops', 'Laptop Accessories'],
  Audio: ['Headphones', 'Speakers', 'Earbuds'],
  Men: ["Men's Clothing", "Men's Shoes", 'Watches'],
  Women: ["Women's Clothing", 'Handbags', 'Jewelry'],
  Kids: ['Boys', 'Girls', 'Infants'],
  Furniture: ['Sofas', 'Beds', 'Tables'],
  Kitchen: ['Cookware', 'Appliances', 'Storage'],
  Decor: ['Lighting', 'Wall Art', 'Rugs'],
  Skincare: ['Moisturizers', 'Cleansers', 'Sunscreen'],
  Makeup: ['Lipstick', 'Foundation', 'Eye Makeup'],
  Fitness: ['Equipment', 'Activewear', 'Recovery'],
  Outdoor: ['Camping', 'Cycling', 'Hiking'],
  Fiction: ['Novels', 'Sci-Fi & Fantasy', 'Mystery'],
  'Non-fiction': ['Biography', 'Self-Help', 'History'],
  Educational: ['STEM Toys', 'Puzzles', 'Learning'],
  'Action Figures': ['Superheroes', 'Anime', 'Collectibles'],
  Beverages: ['Coffee', 'Tea', 'Juices'],
  Snacks: ['Chips', 'Chocolate', 'Nuts'],
  Accessories: ['Car Care', 'Interior', 'Car Electronics'],
  Tools: ['Hand Tools', 'Power Tools', 'Garage'],
  Supplements: ['Vitamins', 'Protein', 'Herbal'],
  Devices: ['Monitors', 'Wearables', 'First Aid'],
};

const slugify = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
  console.log('🔧 Upgrading category hierarchy to 3 levels…');
  const all = await prisma.category.findMany();
  const byId = new Map(all.map((c) => [c.id, c]));

  // Level-2 categories: have a parent, and that parent has no parent.
  const level2 = all.filter((c) => c.parentId && byId.get(c.parentId)?.parentId == null);

  let created = 0;
  let remapped = 0;

  for (const cat of level2) {
    const names = SUBCATS[cat.name] ?? ['Popular', 'New Arrivals', 'Best Sellers'];

    // Skip if this category already has children (idempotent).
    const existingChildren = all.filter((c) => c.parentId === cat.id);
    let grandchildren = existingChildren;
    if (existingChildren.length === 0) {
      grandchildren = [];
      for (let i = 0; i < names.length; i++) {
        const name = names[i]!;
        const gc = await prisma.category.create({
          data: {
            name,
            slug: `${slugify(`${cat.slug}-${name}`)}`,
            parentId: cat.id,
            sortOrder: i,
            image: `https://picsum.photos/seed/sub-${slugify(cat.slug + name)}/300/300`,
          },
        });
        grandchildren.push(gc);
        created++;
      }
    }

    // Remap products currently on this level-2 category onto its grandchildren.
    const products = await prisma.product.findMany({ where: { categoryId: cat.id }, select: { id: true } });
    for (let i = 0; i < products.length; i++) {
      const target = grandchildren[i % grandchildren.length]!;
      await prisma.product.update({ where: { id: products[i]!.id }, data: { categoryId: target.id } });
      remapped++;
    }
  }

  console.log(`✓ created ${created} subcategories, remapped ${remapped} products`);
  console.log('✅ Done.');
}

main()
  .catch((e) => { console.error('❌ Upgrade failed:', e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
