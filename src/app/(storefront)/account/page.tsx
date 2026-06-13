'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPut, FetchError } from '@/lib/fetcher';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut('/api/account/profile', {
        name: name || undefined,
        phone: phone || undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      await update({ name });
      setCurrentPassword(''); setNewPassword('');
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof FetchError ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={session?.user?.email ?? ''} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Add a phone number" />
        </div>

        <div className="border-t pt-4">
          <h2 className="mb-3 font-semibold">Change password</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cp">Current password</Label>
              <Input id="cp" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np">New password</Label>
              <Input id="np" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </form>
    </div>
  );
}
