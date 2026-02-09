'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { onSnapshot, query, where, orderBy, limit, collection, Timestamp } from 'firebase/firestore';
import {
  Building2,
  DoorOpen,
  TrendingUp,
  Wallet,
  Receipt,
  AlertCircle,
  Activity,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/use-auth';
import { useOverdueDetection } from '@/lib/hooks/use-overdue-detection';
import { formatCurrency } from '@/lib/utils/currency';
import { formatNumber, formatPercentage } from '@/lib/utils/numbers';
import { formatShortDate } from '@/lib/utils/dates';
import { db } from '@/lib/firebase/config';
import { DashboardSkeleton } from '@/components/shared/page-skeleton';
import {
  buildingsCollection,
  invoicesCollection,
  expensesCollection,
  auditLogCollection,
  buildingConverter,
} from '@/lib/firebase/firestore';
import type { Building, Invoice, Expense, AuditLogEntry } from '@/lib/types/models';

type BuildingWithId = Building & { id: string };
type InvoiceWithId = Invoice & { id: string };
type ExpenseWithId = Expense & { id: string };
type AuditLogWithId = AuditLogEntry & { id: string };

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

function getYearRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const { isAdmin, userProfile, firebaseUser } = useAuth();

  // Auto-detect and mark overdue invoices on dashboard load
  useOverdueDetection(firebaseUser?.uid, userProfile?.nameAr);

  const [buildings, setBuildings] = useState<BuildingWithId[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithId[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithId[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogWithId[]>([]);
  const [loading, setLoading] = useState(true);

  // Load buildings
  useEffect(() => {
    const q = query(buildingsCollection, where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => {
      setBuildings(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, []);

  // Load invoices (current year for revenue calculations)
  useEffect(() => {
    const { start } = getYearRange();
    const q = query(
      invoicesCollection,
      where('invoiceDate', '>=', start),
      orderBy('invoiceDate', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, []);

  // Load expenses (current year)
  useEffect(() => {
    const { start } = getYearRange();
    const q = query(
      expensesCollection,
      where('date', '>=', start),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, []);

  // Load recent audit logs
  useEffect(() => {
    const q = query(auditLogCollection, orderBy('timestamp', 'desc'), limit(15));
    const unsub = onSnapshot(q, (snap) => {
      setAuditLogs(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Compute metrics
  const metrics = useMemo(() => {
    const totalBuildings = buildings.length;
    const totalApartments = buildings.reduce((sum, b) => sum + b.apartmentCount, 0);
    const totalOccupied = buildings.reduce((sum, b) => sum + b.occupiedCount, 0);
    const occupancyRate = totalApartments > 0 ? (totalOccupied / totalApartments) * 100 : 0;

    const monthRange = getMonthRange();
    const yearRange = getYearRange();

    // Revenue calculations — only debit invoices, not cancelled
    const activeInvoices = invoices.filter(
      (inv) => inv.type === 'debit' && inv.status !== 'cancelled'
    );

    const monthlyInvoices = activeInvoices.filter(
      (inv) =>
        inv.invoiceDate.toMillis() >= monthRange.start.toMillis() &&
        inv.invoiceDate.toMillis() <= monthRange.end.toMillis()
    );

    const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const yearlyRevenue = activeInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // Outstanding receivables — issued, partially_paid, or overdue invoices
    const outstandingInvoices = activeInvoices.filter(
      (inv) =>
        inv.status === 'issued' || inv.status === 'partially_paid' || inv.status === 'overdue'
    );
    const outstandingReceivables = outstandingInvoices.reduce(
      (sum, inv) => sum + inv.total - (inv.paymentAmount || 0),
      0
    );

    // Expense calculations
    const monthlyExpenses = expenses.filter(
      (exp) =>
        exp.date.toMillis() >= monthRange.start.toMillis() &&
        exp.date.toMillis() <= monthRange.end.toMillis()
    );
    const totalMonthlyExpenses = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      totalBuildings,
      totalApartments,
      occupancyRate,
      monthlyRevenue,
      yearlyRevenue,
      outstandingReceivables,
      totalMonthlyExpenses,
    };
  }, [buildings, invoices, expenses]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t('totalBuildings')}
          value={formatNumber(metrics.totalBuildings, locale)}
          icon={<Building2 className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title={t('totalApartments')}
          value={formatNumber(metrics.totalApartments, locale)}
          icon={<DoorOpen className="h-5 w-5 text-indigo-600" />}
        />
        <MetricCard
          title={t('occupancyRate')}
          value={formatPercentage(metrics.occupancyRate, locale)}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
        />
        <MetricCard
          title={t('monthlyRevenue')}
          value={formatCurrency(metrics.monthlyRevenue, locale)}
          icon={<Receipt className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          title={t('yearlyRevenue')}
          value={formatCurrency(metrics.yearlyRevenue, locale)}
          icon={<TrendingUp className="h-5 w-5 text-teal-600" />}
        />
        <MetricCard
          title={t('monthlyExpenses')}
          value={formatCurrency(metrics.totalMonthlyExpenses, locale)}
          icon={<Wallet className="h-5 w-5 text-orange-600" />}
        />
        <MetricCard
          title={t('outstandingReceivables')}
          value={formatCurrency(metrics.outstandingReceivables, locale)}
          icon={<AlertCircle className="h-5 w-5 text-red-600" />}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('recentActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noActivity')}</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <ActivityRow key={log.id} log={log} locale={locale} t={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="truncate text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityRow({
  log,
  locale,
  t,
}: {
  log: AuditLogWithId;
  locale: string;
  t: ReturnType<typeof useTranslations<'dashboard'>>;
}) {
  const actionKey = `actions.${log.action}` as const;
  const entityKey = `entities.${log.entityType}` as const;

  let actionLabel: string;
  try {
    actionLabel = t(actionKey as Parameters<typeof t>[0]);
  } catch {
    actionLabel = log.action;
  }

  let entityLabel: string;
  try {
    entityLabel = t(entityKey as Parameters<typeof t>[0]);
  } catch {
    entityLabel = log.entityType;
  }

  return (
    <div className="flex items-start gap-3 rounded-md border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {actionLabel}
          </Badge>
          <span className="text-muted-foreground">{entityLabel}</span>
          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
            {log.entityId.substring(0, 8)}...
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{log.userName}</span>
          <span>·</span>
          <span>{formatShortDate(log.timestamp.toDate(), locale)}</span>
        </div>
      </div>
    </div>
  );
}
