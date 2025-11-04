import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';

const Profile = () => {
  const { user, userRole } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState<string>(user?.user_metadata?.name || '');
  const [phone, setPhone] = useState<string>(user?.user_metadata?.phone || '');

  const email = user?.email || '';
  const role = userRole || user?.user_metadata?.role || 'user';

  const onSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      await supabase.auth.updateUser({
        data: { name, phone },
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <h1 className="text-xl font-semibold">Profile</h1>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Card className="border border-border bg-card elevated-card rounded-lg">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border">
                <AvatarImage src="" alt={name || email} />
                <AvatarFallback>{(name?.[0] || email?.[0] || 'U').toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{name || 'Your Name'}</CardTitle>
                <CardDescription className="capitalize">{role.replace('_', ' ')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {!editing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">Full name</p>
                  <p className="font-medium">{name || '—'}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{email}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{phone || '—'}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{role.replace('_', ' ')}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1 block">Full name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Email</Label>
                  <Input value={email} disabled />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 98765 43210" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Role</Label>
                  <Input value={role.replace('_', ' ')} disabled />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              {!editing ? (
                <Button onClick={() => setEditing(true)}>Edit</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                  <Button onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;


