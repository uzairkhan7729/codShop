# Noon-style E-Commerce Platform

Production-grade e-commerce platform + admin panel built with **Next.js 14 (App Router)**, **TypeScript (strict)**, **Prisma + MongoDB**, **Stripe**, **NextAuth (JWT)**, **Zustand**, **TanStack Query**, **Tailwind + Framer Motion**, and **shadcn/ui**.

Architecture follows **SOLID**: thin API controllers → services (business logic, depend on abstractions) → repositories (data access, the only place Prisma is touched).

```
src/
  app/                # App Router: storefront, /admin, /api
  components/         # UI + shadcn/ui primitives
  server/
    repositories/     # IProductRepository, IOrderRepository, ... (data access)
    services/         # ProductService, CartService, PaymentService (abstractions)
    payments/         # IPaymentGateway + StripePaymentGateway (Open/Closed)
  lib/                # prisma client, auth, cache, validation (zod), utils
  stores/             # Zustand stores
  hooks/              # TanStack Query hooks
prisma/
  schema.prisma       # MongoDB schema (collections prefixed ecom_)
  seed.ts             # realistic dummy data generator
```

## Prerequisites

- Node.js >= 20
- **MongoDB running as a replica set** (Prisma needs it for transactions)
- A Stripe test account

### Running MongoDB as a single-node replica set (local)

Standalone `mongod` does **not** support Prisma transactions. Start it as a replica set:

```bash
mongod --dbpath /your/data/path --replSet rs0
# then once, in a mongosh shell:
mongosh --eval "rs.initiate()"
```

Your connection string becomes: `mongodb://localhost:27017/ecommerce?replicaSet=rs0`

> Using **MongoDB Atlas**? Replica sets are default — just paste the `mongodb+srv://...` URI into `DATABASE_URL`. Recommended for Render.

## Setup

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
#    fill in DATABASE_URL, NEXTAUTH_SECRET, JWT secrets, Stripe keys

# 3. Push schema to MongoDB (creates collections + indexes)
npm run db:push

# 4. Seed realistic dummy data (users, products, orders, reviews, coupons)
npm run db:seed

# 5. Run
npm run dev
```

App runs at http://localhost:3000 — admin panel at http://localhost:3000/admin.

### Stripe test keys

1. Create a free account at https://dashboard.stripe.com.
2. Toggle **Test mode** (top-right).
3. Copy keys from https://dashboard.stripe.com/test/apikeys into `.env`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
4. For local webhooks, install the Stripe CLI and run:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
5. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## Deployment (Render)

This is a single full-stack Next.js app (frontend + API routes), deployed as one **Web Service**, backed by **MongoDB Atlas** and optionally **Render Redis**. See `render.yaml`.

```
Build command:  npm install && npm run build
Start command:  npm run start
```

Set all `.env` values as Render environment variables. Run `npm run db:push` and `npm run db:seed` once against the Atlas cluster.

## Module status

- [x] **Module 1** — Database schema (Prisma + MongoDB, `ecom_` collections)
- [ ] Module 2 — Repository layer
- [ ] Module 3 — Service layer
- [ ] Module 4 — API routes
- [ ] Module 5 — Storefront
- [ ] Module 6 — Admin panel
- [ ] Module 7 — Seed data
- [ ] Module 8 — Animations
- [ ] Module 9 — Stripe integration
- [ ] Module 10 — Caching & performance
- [ ] Module 11 — Security
- [ ] Module 12 — Error handling & monitoring
