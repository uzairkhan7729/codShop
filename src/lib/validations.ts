import { z } from 'zod';

/** Shared Zod schemas for API input validation (Module 4). */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const productSortSchema = z
  .enum(['newest', 'price_asc', 'price_desc', 'rating', 'best_selling'])
  .optional();

export const productQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(), // slug
  brand: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  featured: z.coerce.boolean().optional(),
  sort: productSortSchema,
});

export const variantSchema = z.object({
  sku: z.string().min(1),
  size: z.string().optional(),
  color: z.string().optional(),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  image: z.string().url().optional(),
});

export const productInputSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug may contain lowercase letters, numbers and hyphens only'),
  description: z.string().min(10),
  price: z.number().min(0),
  comparePrice: z.number().min(0).optional(),
  sku: z.string().min(1),
  brand: z.string().optional(),
  images: z.array(z.string().url()).min(1, 'Add at least one image'),
  categoryId: z.string().min(1),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  variants: z.array(variantSchema).optional(),
});

export const productUpdateSchema = productInputSchema.partial();

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

export const couponApplySchema = z.object({
  code: z.string().min(1).max(40),
});

export const addressSchema = z.object({
  type: z.enum(['SHIPPING', 'BILLING']).default('SHIPPING'),
  fullName: z.string().min(2),
  phone: z.string().min(5),
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(2).default('US'),
  isDefault: z.boolean().default(false),
});

export const checkoutSchema = z.object({
  addressId: z.string().min(1).optional(),
  shippingAddress: addressSchema.omit({ type: true, isDefault: true }).optional(),
  billingAddress: addressSchema.omit({ type: true, isDefault: true }).optional(),
  shippingMethod: z.enum(['STANDARD', 'EXPRESS']).default('STANDARD'),
});

export const guestCheckoutSchema = z.object({
  email: z.string().email('Enter a valid email'),
  name: z.string().min(2).max(80).optional(),
  shippingMethod: z.enum(['STANDARD', 'EXPRESS']).default('STANDARD'),
  shippingAddress: addressSchema.omit({ type: true, isDefault: true }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).nullable().optional(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, 'Your cart is empty')
    .max(100),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  comment: z.string().max(2000).optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
});

export const couponInputSchema = z.object({
  code: z.string().min(3).max(40),
  description: z.string().optional(),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().min(0),
  minPurchase: z.number().min(0).default(0),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  usageLimitPerUser: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
});

export const refundSchema = z.object({
  amount: z.number().min(0).optional(),
});

export const categoryInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  image: z.string().url().optional(),
  parentId: z.string().optional(),
});
