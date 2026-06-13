'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSyncGuestCart } from '@/hooks/use-cart';
import { AuthShell } from '@/components/auth-shell';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/';
  const sync = useSyncGuestCart();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn('credentials', { ...form, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error('Invalid email or password');
      return;
    }
    await sync.mutateAsync().catch(() => undefined);
    toast.success('Welcome back!');
    router.push(callbackUrl);
    router.refresh();
  };

  const fill = (email: string, password: string) => setForm({ email, password });

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
      <p className="mb-6 text-sm text-muted-foreground">Sign in to continue to your account.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" placeholder="you@example.com"
            value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required autoComplete="current-password" placeholder="••••••••"
            value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </div>
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>) : 'Sign in'}
          </Button>
        </motion.div>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">Create one</Link>
      </p>

      <div className="mt-6 rounded-lg border border-dashed bg-muted/40 p-3 text-xs">
        <p className="mb-2 font-medium text-muted-foreground">Demo accounts — click to fill:</p>
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => fill('customer@noon.test', 'Customer123!')} className="rounded-md bg-background px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground">
            🛍️ Customer · customer@noon.test
          </button>
          <button type="button" onClick={() => fill('admin@noon.test', 'Admin123!')} className="rounded-md bg-background px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground">
            🛠️ Admin · admin@noon.test
          </button>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
