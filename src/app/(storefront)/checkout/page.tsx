'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { Check, Info, Loader2 } from 'lucide-react';
import type { Address } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useServerCart } from '@/hooks/use-cart';
import { useGuestCart } from '@/stores/cart-store';
import { Skeleton } from '@/components/ui/skeleton';
import { CountrySelect, PhoneInput } from '@/components/address-fields';
import { apiFetch, apiPost, FetchError } from '@/lib/fetcher';
import { getStripe } from '@/lib/stripe-client';
import { calculatePricing } from '@/lib/pricing';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const STEPS = ['Address', 'Shipping', 'Payment'] as const;

interface NewAddress {
  fullName: string; phone: string; line1: string; line2?: string;
  city: string; state: string; postalCode: string; country: string;
}
const EMPTY_ADDRESS: NewAddress = {
  fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US',
};

interface SummaryLine { id: string; name: string; image: string | null; unitPrice: number; quantity: number; lineTotal: number }

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isGuest = status === 'unauthenticated';

  const { data: serverCart, isLoading: serverLoading } = useServerCart();
  const guestItems = useGuestCart((s) => s.items);
  const guestSubtotal = useGuestCart((s) => s.subtotal());

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [addressId, setAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<NewAddress>(EMPTY_ADDRESS);
  const [useNew, setUseNew] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiFetch<Address[]>('/api/account/addresses'),
    enabled: status === 'authenticated',
  });

  useEffect(() => {
    if (isGuest) { setUseNew(true); return; }
    if (addresses && addresses.length > 0 && !addressId && !useNew) {
      setAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0]!.id);
    } else if (addresses && addresses.length === 0) {
      setUseNew(true);
    }
  }, [addresses, addressId, useNew, isGuest]);

  const stripePromise = useMemo(() => getStripe(), []);

  // Unified cart view (server or guest)
  const lines: SummaryLine[] = useMemo(
    () =>
      isGuest
        ? guestItems.map((i) => ({
            id: `${i.productId}-${i.variantId}`, name: i.name, image: i.image, unitPrice: i.price, quantity: i.quantity, lineTotal: i.price * i.quantity,
          }))
        : (serverCart?.items ?? []),
    [isGuest, guestItems, serverCart],
  );
  const subtotal = isGuest ? guestSubtotal : (serverCart?.pricing.subtotal ?? 0);
  // Recompute with the SELECTED shipping method so Express (+$25) is reflected
  // in the summary. (The cart's own pricing assumes Standard shipping.)
  const pricing = isGuest
    ? calculatePricing(guestSubtotal, 0, shippingMethod)
    : serverCart
      ? calculatePricing(serverCart.pricing.subtotal, serverCart.pricing.discount, shippingMethod)
      : undefined;

  if (status === 'loading' || (!isGuest && serverLoading)) {
    return (
      <div className="container max-w-4xl py-6">
        <Skeleton className="mb-6 h-8 w-40" />
        <Skeleton className="mb-8 h-10 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-10 w-44" />
          </div>
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
      </div>
    );
  }
  if (lines.length === 0) {
    return (
      <div className="container py-20 text-center">
        <p className="mb-4 text-muted-foreground">Your cart is empty.</p>
        <Button onClick={() => router.push('/products')}>Browse products</Button>
      </div>
    );
  }

  // Create the order + payment intent. Runs in the background on the payment
  // step so the user sees progress instead of a blocked button.
  const createIntent = async () => {
    setCreating(true);
    setPaymentError(null);
    try {
      let res: { orderId: string; orderNumber: string; clientSecret: string | null };
      if (isGuest) {
        res = await apiPost('/api/checkout/guest', {
          email,
          name: name || undefined,
          shippingAddress: newAddress,
          shippingMethod,
          items: guestItems.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        });
        // Guest cart is cleared on the success page (after payment), not here.
      } else {
        const body = useNew ? { shippingAddress: newAddress, shippingMethod } : { addressId, shippingMethod };
        res = await apiPost('/api/checkout', body);
      }
      setOrderId(res.orderId);
      setOrderNumber(res.orderNumber);
      setClientSecret(res.clientSecret);
    } catch (err) {
      setPaymentError(err instanceof FetchError ? err.message : 'Could not start checkout. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Advance to the payment step immediately; create the intent if not already done.
  const goToPayment = () => {
    setStep(2);
    if (!clientSecret && !orderId) void createIntent();
  };

  // Changing the shipping method invalidates any created intent (total changed).
  const changeShipping = (method: 'STANDARD' | 'EXPRESS') => {
    setShippingMethod(method);
    setClientSecret(null);
    setOrderId(null);
    setOrderNumber(null);
    setPaymentError(null);
  };

  const addressValid =
    (useNew
      ? newAddress.fullName && newAddress.phone && newAddress.line1 && newAddress.city && newAddress.state && newAddress.postalCode
      : Boolean(addressId)) && (!isGuest || /.+@.+\..+/.test(email));

  return (
    <div className="container max-w-4xl py-6">
      <h1 className="mb-2 text-2xl font-bold">Checkout</h1>
      {isGuest && (
        <p className="mb-6 text-sm text-muted-foreground">
          Checking out as a guest.{' '}
          <button onClick={() => router.push('/login?callbackUrl=/checkout')} className="font-medium text-primary hover:underline">
            Sign in
          </button>{' '}
          for faster checkout and order tracking.
        </p>
      )}

      {/* Progress */}
      <div className="mb-8 flex items-center">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: step === i ? 1.1 : 1 }}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
                  i < step ? 'bg-green-600 text-white' : i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </motion.div>
              <span className={cn('hidden text-sm font-medium sm:inline', i === step ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cn('mx-3 h-0.5 flex-1', i < step ? 'bg-green-600' : 'bg-muted')} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {/* Step 1: Contact + Address */}
          {step === 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              {isGuest && (
                <div className="space-y-3 rounded-lg border p-4">
                  <h2 className="text-lg font-semibold">Contact</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Email" value={email} onChange={setEmail} type="email" />
                    <Field label="Name (optional)" value={name} onChange={setName} />
                  </div>
                  <p className="text-xs text-muted-foreground">We&apos;ll send your order confirmation here.</p>
                </div>
              )}

              <h2 className="text-lg font-semibold">Shipping address</h2>
              {!isGuest && addresses && addresses.length > 0 && !useNew && (
                <div className="space-y-2">
                  {addresses.map((a) => (
                    <label key={a.id} className={cn('flex cursor-pointer gap-3 rounded-lg border p-3', addressId === a.id && 'border-primary bg-primary/5')}>
                      <input type="radio" name="addr" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">{a.fullName} · {a.phone}</p>
                        <p className="text-muted-foreground">{a.line1}, {a.city}, {a.state} {a.postalCode}, {a.country}</p>
                      </div>
                    </label>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setUseNew(true)}>+ Add new address</Button>
                </div>
              )}
              {useNew && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full name" value={newAddress.fullName} onChange={(v) => setNewAddress((s) => ({ ...s, fullName: v }))} />
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <PhoneInput value={newAddress.phone} onChange={(v) => setNewAddress((s) => ({ ...s, phone: v }))} />
                  </div>
                  <Field className="col-span-2" label="Address line 1" value={newAddress.line1} onChange={(v) => setNewAddress((s) => ({ ...s, line1: v }))} />
                  <Field className="col-span-2" label="Address line 2 (optional)" value={newAddress.line2 ?? ''} onChange={(v) => setNewAddress((s) => ({ ...s, line2: v }))} />
                  <Field label="City" value={newAddress.city} onChange={(v) => setNewAddress((s) => ({ ...s, city: v }))} />
                  <Field label="State" value={newAddress.state} onChange={(v) => setNewAddress((s) => ({ ...s, state: v }))} />
                  <Field label="Postal code" value={newAddress.postalCode} onChange={(v) => setNewAddress((s) => ({ ...s, postalCode: v }))} />
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <CountrySelect value={newAddress.country} onChange={(v) => setNewAddress((s) => ({ ...s, country: v }))} />
                  </div>
                  {!isGuest && addresses && addresses.length > 0 && (
                    <Button variant="ghost" size="sm" className="col-span-2 justify-self-start" onClick={() => setUseNew(false)}>Use a saved address</Button>
                  )}
                </div>
              )}
              <Button disabled={!addressValid} onClick={() => setStep(1)}>Continue to shipping</Button>
            </motion.div>
          )}

          {/* Step 2: Shipping */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-lg font-semibold">Shipping method</h2>
              {([
                { id: 'STANDARD', label: 'Standard', desc: '2–4 business days', price: subtotal >= 200 ? 0 : 15 },
                { id: 'EXPRESS', label: 'Express', desc: 'Next business day', price: (subtotal >= 200 ? 0 : 15) + 25 },
              ] as const).map((m) => (
                <label key={m.id} className={cn('flex cursor-pointer items-center justify-between rounded-lg border p-4', shippingMethod === m.id && 'border-primary bg-primary/5')}>
                  <div className="flex items-center gap-3">
                    <input type="radio" checked={shippingMethod === m.id} onChange={() => changeShipping(m.id)} />
                    <div><p className="font-medium">{m.label}</p><p className="text-sm text-muted-foreground">{m.desc}</p></div>
                  </div>
                  <span className="font-semibold">{m.price === 0 ? 'Free' : formatCurrency(m.price)}</span>
                </label>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                <Button onClick={goToPayment}>Continue to payment</Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Payment */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-lg font-semibold">Payment</h2>

              {/* Creating order + payment intent */}
              {creating && (
                <div className="space-y-4 rounded-lg border p-5">
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    Setting up secure payment…
                  </div>
                  <p className="text-xs text-muted-foreground">Reserving your items and preparing a secure card form. This takes a few seconds.</p>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-11 w-full" />
                </div>
              )}

              {/* Error */}
              {!creating && paymentError && (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <p>{paymentError}</p>
                  <Button variant="outline" size="sm" onClick={createIntent}>Try again</Button>
                </div>
              )}

              {/* Ready — Stripe Elements */}
              {!creating && clientSecret && orderId && (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                  <PaymentForm
                    orderId={orderId}
                    orderNumber={orderNumber ?? ''}
                    email={isGuest ? email : (session?.user?.email ?? '')}
                  />
                </Elements>
              )}

              {/* Order created but Stripe not configured */}
              {!creating && !paymentError && orderId && !clientSecret && (
                <div className="rounded-lg border bg-amber-50 p-4 text-sm text-amber-800">
                  Payments are not configured (missing Stripe key). Your order <strong>{orderId}</strong> was created as pending.
                  <Button className="mt-3" onClick={() => router.push('/track')}>Track your order</Button>
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Back</Button>
            </motion.div>
          )}
        </div>

        {/* Order summary */}
        <div className="h-fit space-y-2 rounded-lg border p-4">
          <h2 className="font-semibold">Your order</h2>
          {lines.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span className="line-clamp-1 text-muted-foreground">{i.name} ×{i.quantity}</span>
              <span>{formatCurrency(i.lineTotal)}</span>
            </div>
          ))}
          {pricing && (
            <div className="border-t pt-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(pricing.subtotal)}</span></div>
              {pricing.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(pricing.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(pricing.tax)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{pricing.shippingCost === 0 ? 'Free' : formatCurrency(pricing.shippingCost)}</span></div>
              <div className="mt-1 flex justify-between border-t pt-1 text-base font-bold"><span>Total</span><span>{formatCurrency(pricing.total)}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, className, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; className?: string; type?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Stripe PaymentElement + confirm. Redirects to the success page. */
function PaymentForm({ orderId, orderNumber, email }: { orderId: string; orderNumber: string; email: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const successUrl = new URL(`${window.location.origin}/checkout/success`);
    successUrl.searchParams.set('orderId', orderId);
    if (orderNumber) successUrl.searchParams.set('orderNumber', orderNumber);
    if (email) successUrl.searchParams.set('email', email);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: successUrl.toString() },
    });
    if (error) {
      toast.error(error.message ?? 'Payment failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Test-mode notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <p className="flex items-center gap-2 font-semibold">
          <Info className="h-4 w-4" /> Test mode — no real charge
        </p>
        <p className="mt-1">You can safely complete this purchase with a Stripe test card:</p>
        <ul className="mt-2 space-y-0.5 font-mono text-xs">
          <li>Card&nbsp;&nbsp;&nbsp;<strong>4242 4242 4242 4242</strong></li>
          <li>Expiry&nbsp;any future date (e.g. 12/34)</li>
          <li>CVC&nbsp;&nbsp;&nbsp;&nbsp;any 3 digits&nbsp;&nbsp;·&nbsp;&nbsp;ZIP any</li>
        </ul>
      </div>

      <PaymentElement options={{ defaultValues: { billingDetails: { address: { country: 'US' } } } }} />
      <motion.div whileTap={{ scale: 0.98 }}>
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={!stripe || submitting}>
          {submitting ? 'Processing…' : 'Place order'}
        </Button>
      </motion.div>
    </form>
  );
}
