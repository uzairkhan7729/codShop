/**
 * Database seed (Module 7) — realistic dummy data.
 * Run with:  npm run db:seed   (executed by `node` — Node 24 strips TS types).
 *
 * Generates: 10 categories (+ subcategories), 100+ products with variants,
 * 50+ users with addresses, 200+ orders across the last 6 months, 300+ order
 * items, 100+ reviews, 20 coupons, and 30 days of activity logs.
 */
import { PrismaClient, type OrderStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Deterministic output across runs.
faker.seed(42);

const TAX_RATE = 0.05;
const FREE_SHIPPING = 200;
const SHIP_FLAT = 15;

const CATEGORIES: { name: string; children: string[] }[] = [
  { name: 'Electronics', children: ['Mobiles', 'Laptops', 'Audio'] },
  { name: 'Fashion', children: ['Men', 'Women', 'Kids'] },
  { name: 'Home', children: ['Furniture', 'Kitchen', 'Decor'] },
  { name: 'Beauty', children: ['Skincare', 'Makeup'] },
  { name: 'Sports', children: ['Fitness', 'Outdoor'] },
  { name: 'Books', children: ['Fiction', 'Non-fiction'] },
  { name: 'Toys', children: ['Educational', 'Action Figures'] },
  { name: 'Grocery', children: ['Beverages', 'Snacks'] },
  { name: 'Automotive', children: ['Accessories', 'Tools'] },
  { name: 'Health', children: ['Supplements', 'Devices'] },
];

const BRANDS = [
  'Acme', 'Zenith', 'Lumina', 'NovaTech', 'Apex', 'Vortex', 'Pulse', 'Orbit',
  'Stellar', 'Quantum', 'Fusion', 'Cobalt',
];

const ORDER_STATUSES: OrderStatus[] = [
  'DELIVERED', 'DELIVERED', 'DELIVERED', 'SHIPPED', 'PROCESSING', 'PAID', 'PENDING', 'CANCELLED', 'REFUNDED',
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function img(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/700/700`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

async function clearAll(): Promise<void> {
  // Order matters less in Mongo, but clear children first for clarity.
  await prisma.activityLog.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.session.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.user.deleteMany();
}

async function main(): Promise<void> {
  console.log('🌱 Seeding database…');
  await clearAll();

  const defaultHash = await bcrypt.hash('Password123', 10);
  const adminHash = await bcrypt.hash('Admin123!', 10);

  // ── Users ───────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      name: 'Store Admin',
      email: 'admin@noon.test',
      password: adminHash,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });

  const demoCustomer = await prisma.user.create({
    data: {
      name: 'Demo Customer',
      email: 'customer@noon.test',
      password: await bcrypt.hash('Customer123!', 10),
      role: 'CUSTOMER',
      emailVerified: new Date(),
    },
  });

  const customers = [demoCustomer];
  for (let i = 0; i < 55; i++) {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const user = await prisma.user.create({
      data: {
        name: `${first} ${last}`,
        email: faker.internet.email({ firstName: first, lastName: last + i }).toLowerCase(),
        password: defaultHash,
        phone: faker.phone.number(),
        role: 'CUSTOMER',
        isBlocked: faker.datatype.boolean({ probability: 0.05 }),
        createdAt: faker.date.past({ years: 1 }),
      },
    });
    customers.push(user);
  }
  console.log(`✓ ${customers.length + 1} users`);

  // ── Addresses ───────────────────────────────────────────────
  for (const user of customers) {
    const count = faker.number.int({ min: 1, max: 2 });
    for (let i = 0; i < count; i++) {
      await prisma.address.create({
        data: {
          userId: user.id,
          type: i === 0 ? 'SHIPPING' : 'BILLING',
          fullName: user.name,
          phone: faker.phone.number(),
          line1: faker.location.streetAddress(),
          line2: faker.datatype.boolean() ? faker.location.secondaryAddress() : null,
          city: faker.location.city(),
          state: faker.location.state(),
          postalCode: faker.location.zipCode(),
          country: 'AE',
          isDefault: i === 0,
        },
      });
    }
  }
  console.log('✓ addresses');

  // ── Categories (with nested children) ───────────────────────
  const leafCategoryIds: string[] = [];
  for (let c = 0; c < CATEGORIES.length; c++) {
    const def = CATEGORIES[c]!;
    const parent = await prisma.category.create({
      data: {
        name: def.name,
        slug: slugify(def.name),
        description: `Shop the best in ${def.name}.`,
        image: img(`cat-${def.name}`),
        sortOrder: c,
      },
    });
    for (let s = 0; s < def.children.length; s++) {
      const childName = def.children[s]!;
      const child = await prisma.category.create({
        data: {
          name: childName,
          slug: slugify(`${def.name}-${childName}`),
          description: `${childName} in ${def.name}.`,
          image: img(`cat-${def.name}-${childName}`),
          parentId: parent.id,
          sortOrder: s,
        },
      });
      leafCategoryIds.push(child.id);
    }
  }
  console.log('✓ categories');

  // ── Products (with variants) ────────────────────────────────
  const productIds: { id: string; price: number }[] = [];
  const PRODUCT_COUNT = 120;
  for (let i = 0; i < PRODUCT_COUNT; i++) {
    const name = `${faker.commerce.productAdjective()} ${faker.commerce.product()} ${faker.string.alphanumeric(4).toUpperCase()}`;
    const price = round(faker.number.float({ min: 10, max: 2000, fractionDigits: 2 }));
    const hasDiscount = faker.datatype.boolean({ probability: 0.4 });
    const categoryId = faker.helpers.arrayElement(leafCategoryIds);
    const brand = faker.helpers.arrayElement(BRANDS);
    const stock = faker.number.int({ min: 0, max: 120 });
    const images = Array.from({ length: faker.number.int({ min: 2, max: 4 }) }, (_, k) =>
      img(`prod-${i}-${k}`),
    );

    const withVariants = faker.datatype.boolean({ probability: 0.4 });
    const product = await prisma.product.create({
      data: {
        name,
        slug: `${slugify(name)}-${i}`,
        description: faker.commerce.productDescription() + ' ' + faker.lorem.paragraph(),
        price,
        comparePrice: hasDiscount ? round(price * faker.number.float({ min: 1.1, max: 1.6 })) : null,
        sku: `SKU-${faker.string.alphanumeric(8).toUpperCase()}`,
        brand,
        images,
        categoryId,
        stock,
        lowStockThreshold: 5,
        isActive: faker.datatype.boolean({ probability: 0.95 }),
        isFeatured: faker.datatype.boolean({ probability: 0.15 }),
        soldCount: faker.number.int({ min: 0, max: 500 }),
        metaTitle: name,
        metaDescription: `Buy ${name} online.`,
        createdAt: faker.date.past({ years: 1 }),
        ...(withVariants
          ? {
              variants: {
                create: faker.helpers.arrayElements(['S', 'M', 'L', 'XL', '128GB', '256GB'], 3).map((size) => ({
                  sku: `VAR-${faker.string.alphanumeric(8).toUpperCase()}`,
                  size,
                  color: faker.color.human(),
                  stock: faker.number.int({ min: 0, max: 40 }),
                })),
              },
            }
          : {}),
      },
    });
    productIds.push({ id: product.id, price });
  }
  console.log(`✓ ${productIds.length} products`);

  // ── Coupons ─────────────────────────────────────────────────
  const couponCodes = ['WELCOME10', 'SAVE20', 'FLAT50', 'MEGA25', 'FREESHIP'];
  for (let i = 0; i < 20; i++) {
    const isPercent = faker.datatype.boolean();
    const code = i < couponCodes.length ? couponCodes[i]! : `PROMO${faker.string.alphanumeric(5).toUpperCase()}`;
    await prisma.coupon.create({
      data: {
        code,
        description: isPercent ? 'Percentage discount' : 'Fixed amount off',
        type: isPercent ? 'PERCENTAGE' : 'FIXED',
        value: isPercent ? faker.number.int({ min: 5, max: 30 }) : faker.number.int({ min: 10, max: 100 }),
        minPurchase: faker.helpers.arrayElement([0, 50, 100, 200]),
        maxDiscount: isPercent ? faker.helpers.arrayElement([null, 50, 100]) : null,
        usageLimit: faker.helpers.arrayElement([null, 100, 500]),
        usageLimitPerUser: faker.helpers.arrayElement([1, 2, 3]),
        isActive: faker.datatype.boolean({ probability: 0.85 }),
        expiresAt: faker.date.future({ years: 1 }),
      },
    });
  }
  console.log('✓ 20 coupons');

  // ── Orders + items + payments ───────────────────────────────
  const ORDER_COUNT = 220;
  for (let i = 0; i < ORDER_COUNT; i++) {
    const user = faker.helpers.arrayElement(customers);
    const status = faker.helpers.arrayElement(ORDER_STATUSES);
    const createdAt = faker.date.recent({ days: 180 });
    const itemCount = faker.number.int({ min: 1, max: 4 });
    const chosen = faker.helpers.arrayElements(productIds, itemCount);

    const items = chosen.map((p) => {
      const quantity = faker.number.int({ min: 1, max: 3 });
      return {
        productId: p.id,
        name: faker.commerce.productName(),
        image: img(`order-${i}-${p.id}`),
        sku: `SKU-${faker.string.alphanumeric(6).toUpperCase()}`,
        price: p.price,
        quantity,
        total: round(p.price * quantity),
      };
    });

    const subtotal = round(items.reduce((s, it) => s + it.total, 0));
    const discount = faker.datatype.boolean({ probability: 0.3 })
      ? round(subtotal * faker.helpers.arrayElement([0.1, 0.2]))
      : 0;
    const taxableBase = round(subtotal - discount);
    const tax = round(taxableBase * TAX_RATE);
    const shippingCost = taxableBase >= FREE_SHIPPING ? 0 : SHIP_FLAT;
    const total = round(taxableBase + tax + shippingCost);

    const addr = {
      fullName: user.name,
      phone: faker.phone.number(),
      line1: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      postalCode: faker.location.zipCode(),
      country: 'AE',
    };

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-2026-${String(i + 1).padStart(5, '0')}`,
        userId: user.id,
        status,
        subtotal,
        discount,
        tax,
        shippingCost,
        total,
        couponCode: discount > 0 ? 'SAVE20' : null,
        shippingMethod: faker.helpers.arrayElement(['STANDARD', 'EXPRESS']),
        trackingNumber: ['SHIPPED', 'DELIVERED'].includes(status) ? faker.string.alphanumeric(12).toUpperCase() : null,
        carrier: ['SHIPPED', 'DELIVERED'].includes(status) ? faker.helpers.arrayElement(['DHL', 'Aramex', 'FedEx']) : null,
        shippingAddress: addr,
        billingAddress: addr,
        createdAt,
        items: { create: items },
      },
    });

    // Payment record for non-pending orders.
    if (status !== 'PENDING') {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'STRIPE',
          status: status === 'REFUNDED' ? 'REFUNDED' : status === 'CANCELLED' ? 'FAILED' : 'SUCCEEDED',
          amount: total,
          refundedAmount: status === 'REFUNDED' ? total : 0,
          stripePaymentIntentId: `pi_${faker.string.alphanumeric(20)}`,
          createdAt,
        },
      });
    }
  }
  console.log(`✓ ${ORDER_COUNT} orders (+ items + payments)`);

  // ── Reviews ─────────────────────────────────────────────────
  const reviewedPairs = new Set<string>();
  let reviewCount = 0;
  for (let i = 0; i < 160; i++) {
    const product = faker.helpers.arrayElement(productIds);
    const user = faker.helpers.arrayElement(customers);
    const key = `${product.id}:${user.id}`;
    if (reviewedPairs.has(key)) continue;
    reviewedPairs.add(key);
    await prisma.review.create({
      data: {
        productId: product.id,
        userId: user.id,
        rating: faker.number.int({ min: 2, max: 5 }),
        title: faker.lorem.sentence({ min: 3, max: 6 }),
        comment: faker.lorem.paragraph(),
        createdAt: faker.date.recent({ days: 120 }),
      },
    });
    reviewCount++;
  }

  // Recompute product rating aggregates.
  for (const { id } of productIds) {
    const agg = await prisma.review.aggregate({
      where: { productId: id },
      _avg: { rating: true },
      _count: { rating: true },
    });
    if (agg._count.rating > 0) {
      await prisma.product.update({
        where: { id },
        data: {
          ratingAvg: round(agg._avg.rating ?? 0),
          ratingCount: agg._count.rating,
        },
      });
    }
  }
  console.log(`✓ ${reviewCount} reviews`);

  // ── Activity logs (last 30 days) ────────────────────────────
  const actions = ['USER_LOGIN', 'ORDER_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_CREATED', 'ORDER_STATUS_CHANGED'];
  for (let i = 0; i < 200; i++) {
    await prisma.activityLog.create({
      data: {
        userId: faker.helpers.arrayElement([admin.id, ...customers.map((c) => c.id)]),
        action: faker.helpers.arrayElement(actions),
        entity: faker.helpers.arrayElement(['Order', 'Product', 'User']),
        entityId: faker.string.alphanumeric(24),
        ip: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        createdAt: faker.date.recent({ days: 30 }),
      },
    });
  }
  console.log('✓ activity logs');

  console.log('\n✅ Seed complete.');
  console.log('   Admin:    admin@noon.test / Admin123!');
  console.log('   Customer: customer@noon.test / Customer123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
