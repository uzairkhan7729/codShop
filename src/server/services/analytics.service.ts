import type { Product } from '@prisma/client';
import type {
  IAnalyticsRepository,
  IOrderRepository,
  IProductRepository,
  IUserRepository,
  OrderWithRelations,
  RevenuePoint,
  StatusBucket,
  TopProduct,
} from '@/server/repositories';

export interface DashboardStats {
  revenue: number;
  orders: number;
  customers: number;
  conversionRate: number; // paid orders / customers (proxy)
  revenueSeries: RevenuePoint[];
  topProducts: TopProduct[];
  statusDistribution: StatusBucket[];
  recentOrders: OrderWithRelations[];
  lowStock: Product[];
}

/** AnalyticsService — composes admin dashboard + revenue reports. */
export class AnalyticsService {
  constructor(
    private readonly analytics: IAnalyticsRepository,
    private readonly orders: IOrderRepository,
    private readonly users: IUserRepository,
    private readonly products: IProductRepository,
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const [totals, roles, revenueSeries, topProducts, statusDistribution, recent, lowStock] =
      await Promise.all([
        this.analytics.totals(),
        this.users.countByRole(),
        this.analytics.revenueSeries(30),
        this.analytics.topProducts(5),
        this.analytics.statusDistribution(),
        this.orders.findMany({}, { page: 1, pageSize: 10 }),
        this.products.lowStock(),
      ]);

    const conversionRate =
      roles.customers > 0 ? Math.round((totals.paidOrders / roles.customers) * 1000) / 10 : 0;

    return {
      revenue: totals.revenue,
      orders: totals.orders,
      customers: roles.customers,
      conversionRate,
      revenueSeries,
      topProducts,
      statusDistribution,
      recentOrders: recent.items,
      lowStock: lowStock.slice(0, 10),
    };
  }

  getRevenue(days: number): Promise<RevenuePoint[]> {
    return this.analytics.revenueSeries(days);
  }
}
