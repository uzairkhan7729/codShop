import { sendMail } from '@/lib/mailer';
import { PRICING } from '@/lib/pricing';
import type { IOrderRepository, IProductRepository } from '@/server/repositories';

/**
 * NotificationService — composes and sends transactional emails.
 * Email composition is isolated here (Single Responsibility); delivery is
 * delegated to the mailer, which no-ops gracefully without SMTP.
 */
export class NotificationService {
  constructor(
    private readonly orders: IOrderRepository,
    private readonly products: IProductRepository,
  ) {}

  private layout(title: string, body: string): string {
    return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f6f6;padding:24px">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;padding:32px">
        <h1 style="color:#3866df;font-size:20px">${title}</h1>
        ${body}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#888;font-size:12px">CodShop · This is an automated message.</p>
      </div></body></html>`;
  }

  async sendOrderConfirmationEmail(orderId: string): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (!order) return;
    const rows = order.items
      .map(
        (i) =>
          `<tr><td style="padding:6px 0">${i.name} × ${i.quantity}</td>
           <td style="padding:6px 0;text-align:right">${PRICING.currency} ${i.total.toFixed(2)}</td></tr>`,
      )
      .join('');
    const body = `
      <p>Hi ${order.user.name}, thanks for your order <strong>${order.orderNumber}</strong>!</p>
      <table style="width:100%;border-collapse:collapse">${rows}
        <tr><td style="padding-top:12px"><strong>Total</strong></td>
        <td style="padding-top:12px;text-align:right"><strong>${PRICING.currency} ${order.total.toFixed(
          2,
        )}</strong></td></tr>
      </table>`;
    await sendMail({
      to: order.user.email,
      subject: `Order confirmed — ${order.orderNumber}`,
      html: this.layout('Your order is confirmed 🎉', body),
    });
  }

  async sendShippingUpdate(orderId: string): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (!order) return;
    const tracking = order.trackingNumber
      ? `<p>Tracking number: <strong>${order.trackingNumber}</strong>${
          order.carrier ? ` (${order.carrier})` : ''
        }</p>`
      : '';
    const body = `<p>Hi ${order.user.name}, your order <strong>${order.orderNumber}</strong> is now <strong>${order.status}</strong>.</p>${tracking}`;
    await sendMail({
      to: order.user.email,
      subject: `Shipping update — ${order.orderNumber}`,
      html: this.layout('Order update 🚚', body),
    });
  }

  async sendLowStockAlert(productId: string): Promise<void> {
    const product = await this.products.findById(productId);
    if (!product) return;
    const body = `<p>Product <strong>${product.name}</strong> (SKU ${product.sku}) is low on stock: <strong>${product.stock}</strong> remaining.</p>`;
    await sendMail({
      to: env_adminEmail(),
      subject: `Low stock alert — ${product.name}`,
      html: this.layout('Low stock alert ⚠️', body),
    });
  }
}

function env_adminEmail(): string {
  return process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || 'admin@example.com';
}
