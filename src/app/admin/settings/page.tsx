'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PRICING } from '@/lib/pricing';

/**
 * Settings are sourced from environment variables / pricing config (single
 * source of truth). This screen surfaces the live values; secrets are managed
 * via env on the host (Render) and are never editable from the browser.
 */
export default function AdminSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Store name</Label><Input defaultValue="Noon Commerce" /></div>
          <div className="space-y-1.5"><Label>Currency</Label><Input defaultValue={PRICING.currency} readOnly /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tax & Shipping</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>VAT rate</Label><Input defaultValue={`${PRICING.taxRate * 100}%`} readOnly /></div>
          <div className="space-y-1.5"><Label>Flat shipping</Label><Input defaultValue={PRICING.shippingFlatRate} readOnly /></div>
          <div className="space-y-1.5"><Label>Free shipping over</Label><Input defaultValue={PRICING.freeShippingThreshold} readOnly /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment (Stripe)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Stripe keys are configured via environment variables and never exposed here:
          </p>
          <ul className="space-y-1 text-sm">
            <li><code className="rounded bg-muted px-1.5 py-0.5">STRIPE_SECRET_KEY</code> {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✓ configured' : '— not set'}</li>
            <li><code className="rounded bg-muted px-1.5 py-0.5">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✓ configured' : '— not set'}</li>
            <li><code className="rounded bg-muted px-1.5 py-0.5">STRIPE_WEBHOOK_SECRET</code> (server-only)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
