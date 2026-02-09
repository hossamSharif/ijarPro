'use client';

import { useTranslations } from 'next-intl';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useSyncStatus } from '@/lib/hooks/use-sync-status';
import {
  PENDING_WRITES_LIMIT,
  PENDING_WRITES_WARNING_THRESHOLD,
} from '@/lib/sync/sync-manager';

export function OfflineBanner() {
  const t = useTranslations('sync');
  const { state, pendingCount, online } = useSyncStatus();

  const isOffline = state === 'offline' || !online;
  const isNearLimit = pendingCount >= PENDING_WRITES_WARNING_THRESHOLD;
  const isAtLimit = pendingCount >= PENDING_WRITES_LIMIT;

  if (!isOffline && !isNearLimit) {
    return null;
  }

  return (
    <div className="space-y-0">
      {isOffline && (
        <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 border-b border-yellow-200 dark:border-yellow-800">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>{t('offlineBanner')}</span>
          {pendingCount > 0 && (
            <span className="ms-auto font-medium">
              {t('pendingCount', { count: pendingCount })}
            </span>
          )}
        </div>
      )}
      {isNearLimit && !isAtLimit && (
        <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 text-sm text-orange-800 dark:bg-orange-950 dark:text-orange-200 border-b border-orange-200 dark:border-orange-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t('nearLimit', { count: pendingCount, limit: PENDING_WRITES_LIMIT })}
          </span>
        </div>
      )}
      {isAtLimit && (
        <div className="flex items-center gap-2 bg-red-50 px-4 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200 border-b border-red-200 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t('atLimit')}</span>
        </div>
      )}
    </div>
  );
}
