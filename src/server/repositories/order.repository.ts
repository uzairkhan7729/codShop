import type { Order, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  type OrderFilters,
  type OrderWithRelations,
  type Paginated,
  type PaginationParams,
  toPaginated,
} from './types';

/** IOrderRepository — create, status transitions, listing for user & admin. */
export interface IOrderRepository {
  create(data: Prisma.OrderCreateInput): Promise<OrderWithRelations>;
  findById(id: string): Promise<OrderWithRelations | null>;
  findByNumber(orderNumber: string): Promise<OrderWithRelations | null>;
  findByUser(userId: string, pagination: PaginationParams): Promise<Paginated<OrderWithRelations>>;
  findMany(filters: OrderFilters, pagination: PaginationParams): Promise<Paginated<OrderWithRelations>>;
  updateStatus(id: string, status: OrderStatus, extra?: Prisma.OrderUpdateInput): Promise<Order>;
  update(id: string, data: Prisma.OrderUpdateInput): Promise<Order>;
  countToday(): Promise<number>;
  nextSequence(): Promise<number>;
}

const orderInclude = {
  items: true,
  payment: true,
  user: { select: { id: true, name: true, email: true } },
};

export class OrderRepository implements IOrderRepository {
  create(data: Prisma.OrderCreateInput): Promise<OrderWithRelations> {
    return prisma.order.create({ data, include: orderInclude });
  }

  findById(id: string): Promise<OrderWithRelations | null> {
    return prisma.order.findUnique({ where: { id }, include: orderInclude });
  }

  findByNumber(orderNumber: string): Promise<OrderWithRelations | null> {
    return prisma.order.findUnique({ where: { orderNumber }, include: orderInclude });
  }

  async findByUser(
    userId: string,
    pagination: PaginationParams,
  ): Promise<Paginated<OrderWithRelations>> {
    const where: Prisma.OrderWhereInput = { userId };
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.order.count({ where }),
    ]);
    return toPaginated(items, total, pagination);
  }

  async findMany(
    filters: OrderFilters,
    pagination: PaginationParams,
  ): Promise<Paginated<OrderWithRelations>> {
    const where: Prisma.OrderWhereInput = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { user: { is: { email: { contains: filters.search, mode: 'insensitive' } } } },
        { user: { is: { name: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.order.count({ where }),
    ]);
    return toPaginated(items, total, pagination);
  }

  updateStatus(id: string, status: OrderStatus, extra: Prisma.OrderUpdateInput = {}): Promise<Order> {
    return prisma.order.update({ where: { id }, data: { status, ...extra } });
  }

  update(id: string, data: Prisma.OrderUpdateInput): Promise<Order> {
    return prisma.order.update({ where: { id }, data });
  }

  countToday(): Promise<number> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return prisma.order.count({ where: { createdAt: { gte: start } } });
  }

  /** Total order count, used to build a sequential human-friendly order number. */
  nextSequence(): Promise<number> {
    return prisma.order.count().then((c) => c + 1);
  }
}
