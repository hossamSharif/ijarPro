'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { PermissionGuard } from '@/lib/permissions/guard';
import { useCollection, type WithId } from '@/lib/hooks/use-firestore';
import { buildingsCollection } from '@/lib/firebase/firestore';
import type { Building } from '@/lib/types/models';
import { formatNumber } from '@/lib/utils/numbers';
import { TableSkeleton } from '@/components/shared/page-skeleton';
import { Building as BuildingIcon, Plus } from 'lucide-react';

export default function BuildingsPage() {
  const t = useTranslations('buildings');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const buildingsQuery = useMemo(
    () => query(buildingsCollection, orderBy('nameAr')),
    []
  );
  const { data: buildings, loading } = useCollection<Building>(buildingsQuery);

  const columns: DataTableColumn<WithId<Building>>[] = useMemo(
    () => [
      {
        key: 'nameAr',
        header: t('nameAr'),
        cell: (row) => (
          <div>
            <div className="font-medium">{row.nameAr}</div>
            <div className="text-sm text-muted-foreground">{row.nameEn}</div>
          </div>
        ),
        sortable: true,
      },
      {
        key: 'address',
        header: t('address'),
        cell: (row) => row.address,
        sortable: true,
      },
      {
        key: 'apartmentCount',
        header: t('apartmentCount'),
        cell: (row) => formatNumber(row.apartmentCount, locale),
        sortable: true,
      },
      {
        key: 'occupiedCount',
        header: t('occupiedCount'),
        cell: (row) => (
          <span className="text-orange-600 dark:text-orange-400">{formatNumber(row.occupiedCount, locale)}</span>
        ),
      },
      {
        key: 'vacantCount',
        header: t('vacantCount'),
        cell: (row) => (
          <span className="text-green-600 dark:text-green-400">{formatNumber(row.vacantCount, locale)}</span>
        ),
      },
      {
        key: 'maintenanceCount',
        header: t('maintenanceCount'),
        cell: (row) => (
          <span className="text-yellow-600 dark:text-yellow-400">{formatNumber(row.maintenanceCount, locale)}</span>
        ),
      },
      {
        key: 'status',
        header: t('status'),
        cell: (row) => (
          <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
            {row.status === 'active' ? t('active') : t('inactive')}
          </Badge>
        ),
      },
    ],
    [t, locale]
  );

  if (loading) {
    return <TableSkeleton rows={5} cols={7} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BuildingIcon className="h-8 w-8" />
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
        <PermissionGuard permission="canManageBuildings">
          <Button onClick={() => router.push('/buildings/new')}>
            <Plus className="h-4 w-4 me-2" />
            {t('addBuilding')}
          </Button>
        </PermissionGuard>
      </div>

      <DataTable
        columns={columns}
        data={buildings}
        searchKey="nameAr"
        searchPlaceholder={tc('search')}
        onRowClick={(row) => router.push(`/buildings/${row.id}`)}
      />
    </div>
  );
}
