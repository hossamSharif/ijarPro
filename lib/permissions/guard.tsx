'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import type { PermissionKey } from '@/lib/types/permissions';

export function usePermission(permission: PermissionKey): boolean {
  const { userProfile, isAdmin } = useAuth();
  if (isAdmin) return true;
  if (!userProfile) return false;
  return userProfile.permissions[permission] === true;
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasPermission = usePermission(permission);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
