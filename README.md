# CodShop — E-Commerce Platform

> **Why this repo is public.** I've intentionally kept this codebase open. It's a showcase — not a tutorial clone. After ~10 years of building e-commerce systems, I wanted a single, real, end-to-end project that technical people can actually *read*: the architecture decisions, the trade-offs, the boring-but-important parts (transactions, stock reservation, idempotent webhooks, RBAC, caching) that separate a demo from something you'd run in production.
>
> If you're a developer, recruiter, or fellow engineer poking around my GitHub — this one is meant for you. Read the `src/server` layer; that's where the experience lives.
>
> I have several other repositories too. If something here interests you and you'd like to see more, reach out — happy to share.
>
> **Open to contributions.** This is a living project. PRs that make it more reliable, more correct, or better tested are genuinely welcome — see [Contributing](#contributing) below.

---

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
- [x] **Module 2** — Repository layer (ORM-agnostic interfaces + Prisma impls)
- [x] **Module 3** — Service layer (payment + discount abstractions, SOLID)
- [x] **Module 4** — API routes (NextAuth, Zod, rate limiting)
- [x] **Module 5** — Storefront (home, PLP, PDP, cart, account)
- [x] **Module 6** — Admin panel (dashboard, products, orders, customers, …)
- [x] **Module 7** — Seed data
- [x] **Module 8** — Animations (Framer Motion across the app)
- [x] **Module 9** — Stripe integration (Elements, webhook, refunds)
- [x] **Module 10** — Caching & performance (Redis/memory, ISR, rate limit)
- [x] **Module 11** — Security (JWT cookies, RBAC middleware, sanitize, headers)
- [x] **Module 12** — Error handling (boundaries, typed API errors, toasts)

## What to look at if you're here to judge the code

A quick reading guide for engineers — the parts I'm most proud of:

- **`src/server/repositories/`** — every repository is defined by an interface (`IProductRepository`, `IOrderRepository`, …). Prisma is touched *only* here, so the rest of the app is ORM-agnostic and unit-testable against fakes.
- **`src/server/services/order.service.ts`** — checkout orchestration: a PENDING order is created and stock is **reserved inside a MongoDB transaction**, payment is delegated to `PaymentService`, and the order only flips to PAID when the Stripe **webhook** confirms it. Includes an explicit state machine for fulfilment transitions (`canTransition`).
- **`src/server/payments/`** — `IPaymentGateway` + `StripePaymentGateway`. Swapping or adding a provider doesn't touch business logic (Open/Closed in practice, not as a slogan).
- **`src/server/services/discounts/`** — discount **strategy pattern**; coupon types compose without `if/else` sprawl.
- **`src/server/services/inventory.service.ts`** — stock reservation and the replica-set requirement that makes overselling hard.
- **`src/lib/`** — the cross-cutting glue: typed API helpers, Zod validation, JWT, Redis/in-memory cache with graceful fallback, rate limiting, sanitization.

The intent throughout: thin controllers, fat-but-focused services, dumb repositories. Business rules live in one layer and one layer only.

## Contributing

Contributions are welcome — this repo is meant to keep improving.

Good first areas:
- **Tests** — the service layer is built to be testable; meaningful unit/integration tests are the most valuable PRs.
- **Reliability** — edge cases in checkout, webhook idempotency, stock races, refund flows.
- **DX** — CI, type-coverage, lint rules, a `docker-compose` for the Mongo replica set.

How to contribute:
1. Fork and create a feature branch.
2. `npm install` → set up `.env` (see [Setup](#setup)) → `npm run typecheck` and `npm run lint` should pass.
3. Keep the layering intact — Prisma stays in repositories, business logic in services.
4. Open a PR describing the *why*, not just the *what*. Small, focused PRs get reviewed fastest.

Found a bug or have a design question? Open an issue — I read them.

## About the author

Built and maintained by **Uzair Ahmed** — ~10 years building e-commerce systems. This is one of several projects on my GitHub; if you'd like to see more of my work, feel free to reach out.

> Note: the Stripe webhook endpoint in this codebase is `POST /api/webhooks/stripe`.
