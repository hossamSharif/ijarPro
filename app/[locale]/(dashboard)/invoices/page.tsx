'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getDocs, onSnapshot, query, where, orderBy, collection } from 'firebase/firestore';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/use-auth';
import { formatCurrency } from '@/lib/utils/currency';
import { formatShortDate } from '@/lib/utils/dates';
import type { Invoice, InvoiceStatus, Building } from '@/lib/types/models';
import { invoicesCollection, buildingConverter } from '@/lib/firebase/firestore';
import { db } from '@/lib/firebase/config';

const ALL_STATUSES: InvoiceStatus[] = ['draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled'];

const statusVariants: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  issued: 'default',
  paid: 'default',
  partially_paid: 'outline',
  overdue: 'destructive',
  cancelled: 'secondary',
};

type InvoiceWithId = Invoice & { id: string };
type BuildingWithId = Building & { id: string };

export default function InvoicesPage() {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { isAdmin, userProfile } = useAuth();

  const [invoices, setInvoices] = useState<InvoiceWithId[]>([]);
  const [buildings, setBuildings] = useState<BuildingWithId[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Load buildings for filter
  useEffect(() => {
    const q = query(
      collection(db, 'buildings').withConverter(buildingConverter),
      where('status', '==', 'active'),
      orderBy('nameAr')
    );
    getDocs(q).then((snap) => {
      setBuildings(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
  }, []);

  // Real-time invoice listener
  useEffect(() => {
    const q = query(invoicesCollection, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filtered data
  const filteredInvoices = useMemo(() => {
    let result = invoices;
    if (statusFilter !== 'all') {
      result = result.filter((inv) => inv.status === statusFilter);
    }
    if (buildingFilter !== 'all') {
      result = result.filter((inv) => inv.buildingId === buildingFilter);
    }
    return result;
  }, [invoices, statusFilter, buildingFilter]);

  const canCreate = isAdmin || userProfile?.permissions?.canCreateInvoice;

  const columns: DataTableColumn<InvoiceWithId>[] = [
    {
      key: 'invoiceNumber',
      header: t('invoiceNumber'),
      cell: (row) => (
        <span className="font-mono text-sm font-medium">{row.invoiceNumber}</span>
      ),
      sortable: true,
    },
    {
      key: 'customer',
      header: t('customer'),
      cell: (row) => (
        <span>{locale === 'ar' ? row.customerNameAr : row.customerNameEn}</span>
      ),
    },
    {
      key: 'building',
      header: t('building'),
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.buildingNameAr} — {row.apartmentUnit}
        </span>
      ),
    },
    {
      key: 'total',
      header: t('total'),
      cell: (row) => <span className="font-medium">{formatCurrency(row.total, locale)}</span>,
      sortable: true,
    },
    {
      key: 'status',
      header: t('status.draft'),
      cell: (row) => (
        <div className="flex gap-1">
          <Badge variant={statusVariants[row.status]}>
            {t(`status.${row.status}`)}
          </Badge>
          {row.type === 'credit' && (
            <Badge variant="outline">{t('type.credit')}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'invoiceDate',
      header: t('invoiceDate'),
      cell: (row) => (
        <span className="text-sm">
          {formatShortDate(row.invoiceDate.toDate(), locale)}
        </span>
      ),
      sortable: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {canCreate && (
          <Button onClick={() => router.push('/invoices/new')}>
            <Plus className="me-2 h-4 w-4" />
            {t('createInvoice')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={tCommon('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon('filter')} — {tCommon('status')}</SelectItem>
            {ALL_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={buildingFilter} onValueChange={setBuildingFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('building')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon('filter')} — {t('building')}</SelectItem>
            {buildings.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {locale === 'ar' ? b.nameAr : b.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredInvoices}
        searchPlaceholder={t('invoiceNumber')}
        searchKey="invoiceNumber"
        onRowClick={(row) => router.push(`/invoices/${row.id}`)}
      />
    </div>
  );
}
