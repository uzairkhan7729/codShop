/**
 * Service composition root.
 *
 * Services receive their dependencies as constructor arguments — repository
 * interfaces, the cache abstraction, and the payment gateway abstraction. This
 * is where the object graph is wired (poor-man's DI container); nothing else in
 * the app news-up a service.
 */
import { cache } from '@/lib/cache';
import { paymentGateway } from '@/server/payments';
import { repositories } from '@/server/repositories';

import { AuthService } from './auth.service';
import { CartService } from './cart.service';
import { CategoryService } from './category.service';
import { CouponService } from './coupon.service';
import { InventoryService } from './inventory.service';
import { NotificationService } from './notification.service';
import { OrderService } from './order.service';
import { PaymentService } from './payment.service';
import { ProductService } from './product.service';
import { ReviewService } from './review.service';

export interface ServiceContainer {
  auth: AuthService;
  products: ProductService;
  categories: CategoryService;
  cart: CartService;
  coupons: CouponService;
  inventory: InventoryService;
  notifications: NotificationService;
  orders: OrderService;
  payments: PaymentService;
  reviews: ReviewService;
}

function build(): ServiceContainer {
  const r = repositories;

  const couponService = new CouponService(r.coupons);
  const productService = new ProductService(r.products, r.categories, cache);
  const categoryService = new CategoryService(r.categories, cache);
  const inventoryService = new InventoryService(r.products);
  const notificationService = new NotificationService(r.orders, r.products);
  const cartService = new CartService(r.carts, r.products, r.coupons, couponService);
  const orderService = new OrderService(
    r.orders,
    r.carts,
    r.products,
    r.coupons,
    r.users,
    inventoryService,
    couponService,
    notificationService,
  );
  const paymentService = new PaymentService(paymentGateway, r.payments, r.orders, orderService);
  const reviewService = new ReviewService(r.reviews, r.products, productService);
  const authService = new AuthService(r.users, r.sessions);

  return {
    auth: authService,
    products: productService,
    categories: categoryService,
    cart: cartService,
    coupons: couponService,
    inventory: inventoryService,
    notifications: notificationService,
    orders: orderService,
    payments: paymentService,
    reviews: reviewService,
  };
}

const globalForServices = globalThis as unknown as { services?: ServiceContainer };

export const services: ServiceContainer = globalForServices.services ?? build();
if (process.env.NODE_ENV !== 'production') globalForServices.services = services;
