'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getDocs, onSnapshot, query, where, orderBy, collection } from 'firebase/firestore';
import { Plus, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { useAuth } from '@/lib/hooks/use-auth';
import { formatCurrency } from '@/lib/utils/currency';
import { formatShortDate } from '@/lib/utils/dates';
import type { Expense, Building } from '@/lib/types/models';
import type { Company } from '@/lib/types/models';
import { expensesCollection, buildingConverter, companyRef } from '@/lib/firebase/firestore';
import { db } from '@/lib/firebase/config';

type ExpenseWithId = Expense & { id: string };
type BuildingWithId = Building & { id: string };

export default function ExpensesPage() {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { isAdmin, userProfile } = useAuth();

  const [expenses, setExpenses] = useState<ExpenseWithId[]>([]);
  const [buildings, setBuildings] = useState<BuildingWithId[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
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

  // Load expense categories from company profile
  useEffect(() => {
    const unsub = onSnapshot(companyRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCategories(data.expenseCategories || []);
      }
    });
    return () => unsub();
  }, []);

  // Real-time expense listener
  useEffect(() => {
    const q = query(expensesCollection, orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filtered data
  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (categoryFilter !== 'all') {
      result = result.filter((exp) => exp.category === categoryFilter);
    }
    if (buildingFilter !== 'all') {
      result = result.filter((exp) => exp.buildingId === buildingFilter);
    }
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter((exp) => exp.date.toDate() >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((exp) => exp.date.toDate() <= toDate);
    }
    return result;
  }, [expenses, categoryFilter, buildingFilter, dateFrom, dateTo]);

  const canAddExpense = isAdmin || userProfile?.permissions?.canAddExpense;

  const getBuildingName = (buildingId?: string) => {
    if (!buildingId) return '—';
    const b = buildings.find((b) => b.id === buildingId);
    return b ? (locale === 'ar' ? b.nameAr : b.nameEn) : buildingId;
  };

  const columns: DataTableColumn<ExpenseWithId>[] = [
    {
      key: 'date',
      header: t('date'),
      cell: (row) => (
        <span className="text-sm">
          {formatShortDate(row.date.toDate(), locale)}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'category',
      header: t('category'),
      cell: (row) => (
        <span className="text-sm font-medium">{row.category}</span>
      ),
    },
    {
      key: 'description',
      header: t('description'),
      cell: (row) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
          {row.description}
        </span>
      ),
    },
    {
      key: 'amount',
      header: t('amount'),
      cell: (row) => (
        <span className="font-medium">{formatCurrency(row.amount, locale)}</span>
      ),
      sortable: true,
    },
    {
      key: 'vatAmount',
      header: t('vatAmount'),
      cell: (row) => (
        <span className="text-sm">
          {row.vatAmount ? formatCurrency(row.vatAmount, locale) : '—'}
        </span>
      ),
    },
    {
      key: 'building',
      header: t('building'),
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {getBuildingName(row.buildingId)}
        </span>
      ),
    },
    {
      key: 'receipt',
      header: t('receipt'),
      cell: (row) =>
        row.receiptUrl ? (
          <a
            href={row.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {t('viewReceipt')}
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
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
        {canAddExpense && (
          <Button onClick={() => router.push('/expenses/new')}>
            <Plus className="me-2 h-4 w-4" />
            {t('addExpense')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('selectCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allCategories')}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={buildingFilter} onValueChange={setBuildingFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('selectBuilding')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allBuildings')}</SelectItem>
            {buildings.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {locale === 'ar' ? b.nameAr : b.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder={t('dateFrom')}
          className="w-[160px]"
        />

        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder={t('dateTo')}
          className="w-[160px]"
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredExpenses}
        searchPlaceholder={t('description')}
        searchKey="description"
      />
    </div>
  );
}
