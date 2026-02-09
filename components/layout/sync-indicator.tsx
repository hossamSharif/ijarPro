'use client';

import { useTranslations } from 'next-intl';
import { Cloud, CloudOff, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSyncStatus } from '@/lib/hooks/use-sync-status';
import { PENDING_WRITES_WARNING_THRESHOLD } from '@/lib/sync/sync-manager';
import type { SyncState } from '@/lib/sync/sync-manager';
import { Badge } from '@/components/ui/badge';

const stateConfig: Record<SyncState, { icon: typeof Cloud; className: string; key: string }> = {
  synced: { icon: CheckCircle, className: 'text-green-500', key: 'synced' },
  syncing: { icon: Loader2, className: 'text-amber-500 animate-spin', key: 'syncing' },
  offline: { icon: CloudOff, className: 'text-yellow-500', key: 'offline' },
  pending: { icon: Cloud, className: 'text-orange-500', key: 'pending' },
  error: { icon: AlertTriangle, className: 'text-red-500', key: 'error' },
};

export function SyncIndicator() {
  const t = useTranslations('sync');
  const { state, pendingCount } = useSyncStatus();
  const config = stateConfig[state];
  const Icon = config.icon;

  const showCount = pendingCount > 0 && (state === 'pending' || state === 'offline');
  const isNearLimit = pendingCount >= PENDING_WRITES_WARNING_THRESHOLD;

  return (
    <div className="flex items-center gap-1.5 text-xs" title={t(config.key)}>
      <Icon className={`h-3.5 w-3.5 ${config.className}`} />
      <span className="hidden sm:inline text-muted-foreground">{t(config.key)}</span>
      {showCount && (
        <Badge
          variant={isNearLimit ? 'destructive' : 'secondary'}
          className="h-5 px-1.5 text-[10px]"
        >
          {pendingCount}
        </Badge>
      )}
    </div>
  );
}
