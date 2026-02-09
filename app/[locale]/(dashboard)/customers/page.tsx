'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { PermissionGuard } from '@/lib/permissions/guard';
import { useCollection, type WithId } from '@/lib/hooks/use-firestore';
import { getAllCustomersQuery } from '@/lib/firebase/customers';
import type { Customer } from '@/lib/types/models';
import { Users, Plus, AlertTriangle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { TableSkeleton } from '@/components/shared/page-skeleton';

export default function CustomersPage() {
  const t = useTranslations('customers');
  const tc = useTranslations('common');
  const router = useRouter();

  const customersQuery = useMemo(() => getAllCustomersQuery(), []);
  const { data: customers, loading } = useCollection<Customer>(customersQuery);

  const isExpired = (idExpiry: Timestamp) => {
    return idExpiry.toDate() < new Date();
  };

  const columns: DataTableColumn<WithId<Customer>>[] = useMemo(
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
        key: 'nationalId',
        header: t('nationalId'),
        cell: (row) => (
          <div className="flex items-center gap-2">
            <span className="font-mono">{row.nationalId}</span>
            {isExpired(row.idExpiry) && (
              <Badge variant="destructive" className="text-xs">
                {t('idExpired')}
              </Badge>
            )}
          </div>
        ),
        sortable: true,
      },
      {
        key: 'phone',
        header: t('phone'),
        cell: (row) => <span dir="ltr">{row.phone}</span>,
      },
      {
        key: 'nationality',
        header: t('nationality'),
        cell: (row) => row.nationality,
        sortable: true,
      },
      {
        key: 'currentApartmentId',
        header: t('linkedApartment'),
        cell: (row) =>
          row.currentApartmentId ? (
            <Badge variant="secondary">{t('occupied')}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'isActive',
        header: tc('status'),
        cell: (row) => (
          <Badge variant={row.isActive ? 'default' : 'secondary'}>
            {row.isActive ? tc('active') : tc('inactive')}
          </Badge>
        ),
      },
    ],
    [t, tc]
  );

  const expiredCount = useMemo(
    () => customers.filter((c) => c.isActive && isExpired(c.idExpiry)).length,
    [customers]
  );

  if (loading) {
    return <TableSkeleton rows={5} cols={6} />;
  }

  return (
    <div className="space-y-6">
      {expiredCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{t('expiredIdsWarning', { count: expiredCount })}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
        <PermissionGuard permission="canManageCustomers">
          <Button onClick={() => router.push('/customers/new')}>
            <Plus className="h-4 w-4 me-2" />
            {t('addCustomer')}
          </Button>
        </PermissionGuard>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        searchKey="nameAr"
        searchPlaceholder={tc('search')}
        onRowClick={(row) => router.push(`/customers/${row.id}`)}
        emptyMessage={t('emptyState')}
      />
    </div>
  );
}
