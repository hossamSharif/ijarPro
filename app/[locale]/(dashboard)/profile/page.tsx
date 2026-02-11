'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { toast } from 'sonner';
import { Save, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/hooks/use-auth';
import { usePermission } from '@/lib/permissions/guard';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tu = useTranslations('users');
  const tc = useTranslations('common');
  const tt = useTranslations('toasts');
  const { firebaseUser, userProfile } = useAuth();
  const canChangePassword = usePermission('canChangeOwnPassword');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firebaseUser || !firebaseUser.email) return;

    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t('passwordMinLength'));
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);

      toast.success(t('passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error(t('wrongPassword'));
      } else {
        toast.error(tt('error'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">{tu('nameAr')}</p>
              <p className="font-medium">{userProfile.nameAr}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tu('nameEn')}</p>
              <p className="font-medium">{userProfile.nameEn}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tu('username')}</p>
              <p className="font-medium" dir="ltr">{userProfile.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tu('email')}</p>
              <p className="font-medium" dir="ltr">{userProfile.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tu('role')}</p>
              <Badge variant={userProfile.role === 'admin' ? 'default' : 'secondary'}>
                {userProfile.role === 'admin' ? tu('admin') : tu('user')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      {canChangePassword && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <Lock className="me-2 h-4 w-4 inline" />
              {tu('changePassword')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('currentPassword')}</label>
                <Input
                  dir="ltr"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium">{t('newPassword')}</label>
                <Input
                  dir="ltr"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('confirmPassword')}</label>
                <Input
                  dir="ltr"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  <Save className="me-2 h-4 w-4" />
                  {saving ? tc('loading') : tc('save')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
