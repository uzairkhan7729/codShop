import type { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** IPaymentRepository — persistence for payment records (one per order). */
export interface IPaymentRepository {
  findByOrder(orderId: string): Promise<Payment | null>;
  findByIntent(paymentIntentId: string): Promise<Payment | null>;
  upsertForOrder(orderId: string, data: Prisma.PaymentUncheckedCreateInput): Promise<Payment>;
  updateStatus(id: string, status: PaymentStatus, extra?: Prisma.PaymentUpdateInput): Promise<Payment>;
}

export class PaymentRepository implements IPaymentRepository {
  findByOrder(orderId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { orderId } });
  }

  findByIntent(paymentIntentId: string): Promise<Payment | null> {
    return prisma.payment.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
  }

  async upsertForOrder(
    orderId: string,
    data: Prisma.PaymentUncheckedCreateInput,
  ): Promise<Payment> {
    const { orderId: _omit, ...rest } = data;
    return prisma.payment.upsert({
      where: { orderId },
      create: data,
      update: rest,
    });
  }

  updateStatus(
    id: string,
    status: PaymentStatus,
    extra: Prisma.PaymentUpdateInput = {},
  ): Promise<Payment> {
    return prisma.payment.update({ where: { id }, data: { status, ...extra } });
  }
}
