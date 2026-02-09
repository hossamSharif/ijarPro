'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  collection,
} from 'firebase/firestore';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { ChartOfAccountsTree } from '@/components/accounting/chart-of-accounts';
import { useAuth } from '@/lib/hooks/use-auth';
import { formatCurrency } from '@/lib/utils/currency';
import { TableSkeleton } from '@/components/shared/page-skeleton';
import { formatShortDate } from '@/lib/utils/dates';
import type { Building } from '@/lib/types/models';
import type { JournalEntry, JournalEntryType, Account } from '@/lib/types/accounting';
import {
  journalEntriesCollection,
  accountsCollection,
  buildingConverter,
} from '@/lib/firebase/firestore';
import { seedChartOfAccounts, addCustomSubAccount } from '@/lib/firebase/journal';
import { db } from '@/lib/firebase/config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type JournalEntryWithId = JournalEntry & { id: string };
type BuildingWithId = Building & { id: string };
type AccountWithId = Account & { id?: string };

const ENTRY_TYPES: JournalEntryType[] = [
  'invoice_creation',
  'invoice_payment',
  'invoice_cancellation',
  'invoice_update_reversal',
  'expense',
  'manual',
];

export default function JournalPage() {
  const t = useTranslations('journal');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { isAdmin, userProfile, firebaseUser } = useAuth();

  const [entries, setEntries] = useState<JournalEntryWithId[]>([]);
  const [buildings, setBuildings] = useState<BuildingWithId[]>([]);
  const [accounts, setAccounts] = useState<AccountWithId[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('entries');

  // Add sub-account dialog state
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [parentAccount, setParentAccount] = useState<AccountWithId | null>(null);
  const [newAccountCode, setNewAccountCode] = useState('');
  const [newAccountNameAr, setNewAccountNameAr] = useState('');
  const [newAccountNameEn, setNewAccountNameEn] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);

  const canViewJournal = isAdmin || userProfile?.permissions?.canViewJournal;
  const canCreateEntry = isAdmin || userProfile?.permissions?.canCreateManualEntry;

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

  // Real-time journal entries listener
  useEffect(() => {
    const q = query(journalEntriesCollection, orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Real-time accounts listener
  useEffect(() => {
    const unsub = onSnapshot(accountsCollection, (snap) => {
      const accs = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      accs.sort((a, b) => a.code.localeCompare(b.code));
      setAccounts(accs);
    });
    return () => unsub();
  }, []);

  // Auto-seed chart of accounts if empty
  useEffect(() => {
    if (accounts.length === 0 && !loading && firebaseUser && userProfile) {
      seedChartOfAccounts(firebaseUser.uid, userProfile.nameAr).then((result) => {
        if (result.seeded) {
          toast.success(t('accountsSeeded'));
        }
      });
    }
  }, [accounts.length, loading, firebaseUser, userProfile, t]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (typeFilter !== 'all') {
      result = result.filter((e) => e.entryType === typeFilter);
    }
    if (buildingFilter !== 'all') {
      result = result.filter((e) => e.buildingId === buildingFilter);
    }
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter((e) => e.date.toDate() >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((e) => e.date.toDate() <= toDate);
    }
    return result;
  }, [entries, typeFilter, buildingFilter, dateFrom, dateTo]);

  const getBuildingName = (buildingId?: string) => {
    if (!buildingId) return '—';
    const b = buildings.find((b) => b.id === buildingId);
    return b ? (locale === 'ar' ? b.nameAr : b.nameEn) : '—';
  };

  const getEntryTypeBadgeVariant = (type: JournalEntryType) => {
    switch (type) {
      case 'invoice_creation':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'invoice_payment':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'invoice_cancellation':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'invoice_update_reversal':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'expense':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'manual':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleAddSubAccount = (parent: AccountWithId) => {
    setParentAccount(parent);
    setNewAccountCode(parent.code);
    setNewAccountNameAr('');
    setNewAccountNameEn('');
    setAddAccountOpen(true);
  };

  const handleSubmitSubAccount = async () => {
    if (!firebaseUser || !userProfile || !parentAccount) return;
    if (!newAccountCode || !newAccountNameAr || !newAccountNameEn) return;

    setAddingAccount(true);
    try {
      await addCustomSubAccount({
        code: newAccountCode,
        nameAr: newAccountNameAr,
        nameEn: newAccountNameEn,
        parentCode: parentAccount.code,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });
      toast.success(t('accountAdded'));
      setAddAccountOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setAddingAccount(false);
    }
  };

  const columns: DataTableColumn<JournalEntryWithId>[] = [
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
      key: 'entryType',
      header: t('entryType'),
      cell: (row) => (
        <Badge variant="secondary" className={cn('text-xs', getEntryTypeBadgeVariant(row.entryType))}>
          {t(`types.${row.entryType}`)}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: t('description'),
      cell: (row) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[250px]">
          {row.description}
        </span>
      ),
    },
    {
      key: 'reference',
      header: t('reference'),
      cell: (row) => (
        <span className="text-sm font-mono" dir="ltr">
          {row.referenceNumber || '—'}
        </span>
      ),
    },
    {
      key: 'totalDebits',
      header: t('totalDebits'),
      cell: (row) => (
        <span className="font-medium" dir="ltr">
          {formatCurrency(row.totalDebits, locale)}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'totalCredits',
      header: t('totalCredits'),
      cell: (row) => (
        <span className="font-medium" dir="ltr">
          {formatCurrency(row.totalCredits, locale)}
        </span>
      ),
      sortable: true,
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
  ];

  if (loading) {
    return <TableSkeleton rows={6} cols={7} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {canCreateEntry && (
          <Button onClick={() => router.push('/journal/new')}>
            <Plus className="me-2 h-4 w-4" />
            {t('createEntry')}
          </Button>
        )}
      </div>

      {/* Tabs: Journal Entries | Chart of Accounts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="entries">{t('title')}</TabsTrigger>
          <TabsTrigger value="chart">{t('chartOfAccounts')}</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('selectEntryType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTypes')}</SelectItem>
                {ENTRY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={buildingFilter} onValueChange={setBuildingFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('allBuildings')} />
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
            data={filteredEntries}
            searchPlaceholder={t('description')}
            searchKey="description"
          />
        </TabsContent>

        <TabsContent value="chart" className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t('chartOfAccounts')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('chartOfAccountsDescription')}
                </p>
              </div>
            </div>
            <ChartOfAccountsTree
              accounts={accounts}
              onAddSubAccount={handleAddSubAccount}
              isAdmin={isAdmin}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Sub-Account Dialog */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addSubAccount')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {parentAccount && (
              <div className="text-sm text-muted-foreground">
                {t('parentAccount')}: <span className="font-mono">{parentAccount.code}</span>{' '}
                — {locale === 'ar' ? parentAccount.nameAr : parentAccount.nameEn}
              </div>
            )}
            <div className="space-y-2">
              <Label>{t('accountCode')}</Label>
              <Input
                value={newAccountCode}
                onChange={(e) => setNewAccountCode(e.target.value)}
                dir="ltr"
                placeholder={t('accountCodePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('accountNameAr')}</Label>
              <Input
                value={newAccountNameAr}
                onChange={(e) => setNewAccountNameAr(e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('accountNameEn')}</Label>
              <Input
                value={newAccountNameEn}
                onChange={(e) => setNewAccountNameEn(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAccountOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSubmitSubAccount}
              disabled={addingAccount || !newAccountCode || !newAccountNameAr || !newAccountNameEn}
            >
              {addingAccount ? tCommon('loading') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
