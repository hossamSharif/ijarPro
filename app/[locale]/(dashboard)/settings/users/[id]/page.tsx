'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { ArrowRight, Save, Shield, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/hooks/use-auth';
import { userDoc } from '@/lib/firebase/firestore';
import {
  updateUserPermissions,
  deactivateUser,
  activateUser,
} from '@/lib/firebase/users';
import { FEATURE_FLAGS } from '@/lib/permissions/feature-flags';
import type { User, UserPermissions } from '@/lib/types/models';
import type { PermissionKey } from '@/lib/types/permissions';

export default function UserDetailPage() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const tt = useTranslations('toasts');
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { firebaseUser, userProfile, isAdmin, loading: authLoading } = useAuth();

  const [user, setUser] = useState<(User & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(userDoc(userId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as User & { id: string };
        setUser(data);
        setPermissions({ ...data.permissions });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const handlePermissionToggle = useCallback(
    (key: PermissionKey) => {
      if (!permissions) return;
      setPermissions((prev) => prev ? { ...prev, [key]: !prev[key] } : prev);
    },
    [permissions]
  );

  const handleSavePermissions = async () => {
    if (!firebaseUser || !userProfile || !permissions) return;

    setSaving(true);
    try {
      await updateUserPermissions({
        uid: userId,
        permissions,
        callerUserId: firebaseUser.uid,
        callerUserName: userProfile.nameAr,
      });
      toast.success(t('permissionsSaved'));
    } catch {
      toast.error(tt('error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!firebaseUser || !userProfile) return;

    try {
      await deactivateUser({
        uid: userId,
        callerUserId: firebaseUser.uid,
        callerUserName: userProfile.nameAr,
      });
      toast.success(t('deactivated'));
      setShowDeactivateDialog(false);
    } catch (error: unknown) {
      const message = (error as Error).message;
      if (message.includes('Cannot deactivate yourself')) {
        toast.error(t('cannotDeactivateSelf'));
      } else {
        toast.error(tt('error'));
      }
      setShowDeactivateDialog(false);
    }
  };

  const handleActivate = async () => {
    if (!firebaseUser || !userProfile) return;

    try {
      await activateUser({
        uid: userId,
        callerUserId: firebaseUser.uid,
        callerUserName: userProfile.nameAr,
      });
      toast.success(t('activated'));
      setShowActivateDialog(false);
    } catch {
      toast.error(tt('error'));
      setShowActivateDialog(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    );
  }

  // Group permission flags by category
  const categories = ['invoices', 'management', 'accounting', 'general'] as const;
  const flagsByCategory = categories.map((cat) => ({
    category: cat,
    flags: FEATURE_FLAGS.filter((f) => f.category === cat),
  }));

  const isOwnAccount = firebaseUser?.uid === userId;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/settings/users')}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{t('userDetails')}</h1>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{user.nameAr}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                <Shield className="me-1 h-3 w-3" />
                {user.role === 'admin' ? t('admin') : t('user')}
              </Badge>
              {user.isActive ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <UserCheck className="me-1 h-3 w-3" />
                  {t('active')}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <UserX className="me-1 h-3 w-3" />
                  {t('inactive')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">{t('nameAr')}</p>
              <p className="font-medium">{user.nameAr}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('nameEn')}</p>
              <p className="font-medium">{user.nameEn}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('username')}</p>
              <p className="font-medium" dir="ltr">{user.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('email')}</p>
              <p className="font-medium" dir="ltr">{user.email}</p>
            </div>
            {user.phone && (
              <div>
                <p className="text-sm text-muted-foreground">{t('phone')}</p>
                <p className="font-medium" dir="ltr">{user.phone}</p>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex gap-3">
            {user.isActive ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeactivateDialog(true)}
                disabled={isOwnAccount}
              >
                <UserX className="me-2 h-4 w-4" />
                {t('deactivate')}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActivateDialog(true)}
              >
                <UserCheck className="me-2 h-4 w-4" />
                {t('activate')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permission Toggle Matrix */}
      {user.role !== 'admin' && permissions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('permissions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {flagsByCategory.map(({ category, flags }) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {t(`permissionCategories.${category}`)}
                </h3>
                <div className="space-y-2">
                  {flags.map((flag) => (
                    <label
                      key={flag.key}
                      className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-sm font-medium">
                        {t(`permissionLabels.${flag.key}`)}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={permissions[flag.key]}
                        onClick={() => handlePermissionToggle(flag.key)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          permissions[flag.key] ? 'bg-primary' : 'bg-input'
                        }`}
                      >
                        <span
                          className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                            permissions[flag.key] ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </div>
                {category !== 'general' && <Separator className="mt-4" />}
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSavePermissions} disabled={saving}>
                <Save className="me-2 h-4 w-4" />
                {saving ? tc('loading') : tc('save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {user.role === 'admin' && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              {t('admin')} — {t('permissions')} ✓
            </p>
          </CardContent>
        </Card>
      )}

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deactivate')}</DialogTitle>
            <DialogDescription>{t('confirmDeactivate')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeactivate}>
              {t('deactivate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Confirmation Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('activate')}</DialogTitle>
            <DialogDescription>{t('confirmActivate')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleActivate}>
              {t('activate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
