'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { invoicesCollection } from '@/lib/firebase/firestore';
import { formatCurrency } from '@/lib/utils/currency';
import { formatNumber } from '@/lib/utils/numbers';
import { formatShortDate } from '@/lib/utils/dates';
import type { Invoice } from '@/lib/types/models';

type InvoiceWithId = Invoice & { id: string };

interface AgingBucket {
  label: string;
  count: number;
  amount: number;
}

function getDaysOverdue(invoiceDate: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - invoiceDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getBucketIndex(days: number): number {
  if (days === 0) return 0;
  if (days <= 30) return 1;
  if (days <= 60) return 2;
  if (days <= 90) return 3;
  return 4;
}

export function AgingReport() {
  const t = useTranslations('reports.agingReport');
  const tReports = useTranslations('reports');
  const locale = useLocale();

  const [invoices, setInvoices] = useState<InvoiceWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get all outstanding invoices (issued, partially_paid, overdue)
    const q = query(
      invoicesCollection,
      where('type', '==', 'debit'),
      orderBy('invoiceDate', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const outstandingInvoices = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          inv.status === 'issued' ||
          inv.status === 'partially_paid' ||
          inv.status === 'overdue'
      ),
    [invoices]
  );

  const bucketLabels = [
    t('current'),
    t('days1to30'),
    t('days31to60'),
    t('days61to90'),
    t('days90plus'),
  ];

  const buckets = useMemo(() => {
    const result: AgingBucket[] = bucketLabels.map((label) => ({
      label,
      count: 0,
      amount: 0,
    }));

    for (const inv of outstandingInvoices) {
      const days = getDaysOverdue(inv.invoiceDate.toDate());
      const idx = getBucketIndex(days);
      const outstanding = inv.total - (inv.paymentAmount || 0);
      result[idx].count++;
      result[idx].amount += outstanding;
    }

    return result;
  }, [outstandingInvoices]);

  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + inv.total - (inv.paymentAmount || 0),
    0
  );

  const chartData = buckets.map((b) => ({
    name: b.label,
    amount: b.amount,
  }));

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Chart */}
      {outstandingInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{tReports('aging')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, locale)}
                />
                <Bar dataKey="amount" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bucket Summary */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('totalOutstanding')}: {formatCurrency(totalOutstanding, locale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {buckets.every((b) => b.count === 0) ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {tReports('noData')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-3 py-2 text-start font-medium">{t('bucket')}</th>
                    <th className="px-3 py-2 text-center font-medium">#</th>
                    <th className="px-3 py-2 text-end font-medium">{t('outstanding')}</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((bucket, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-3 py-2 font-medium">{bucket.label}</td>
                      <td className="px-3 py-2 text-center">
                        {formatNumber(bucket.count, locale)}
                      </td>
                      <td className="px-3 py-2 text-end" dir="ltr">
                        {formatCurrency(bucket.amount, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="px-3 py-2">{t('total')}</td>
                    <td className="px-3 py-2 text-center">
                      {formatNumber(
                        buckets.reduce((s, b) => s + b.count, 0),
                        locale
                      )}
                    </td>
                    <td className="px-3 py-2 text-end" dir="ltr">
                      {formatCurrency(totalOutstanding, locale)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Table */}
      {outstandingInvoices.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-3 py-2 text-start font-medium">{t('customer')}</th>
                    <th className="px-3 py-2 text-start font-medium">{t('invoiceNumber')}</th>
                    <th className="px-3 py-2 text-center font-medium">{t('invoiceDate')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('total')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('paid')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('outstanding')}</th>
                    <th className="px-3 py-2 text-center font-medium">{t('daysOverdue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingInvoices.map((inv) => {
                    const outstanding = inv.total - (inv.paymentAmount || 0);
                    const days = getDaysOverdue(inv.invoiceDate.toDate());
                    return (
                      <tr key={inv.id} className="border-b">
                        <td className="px-3 py-2">
                          {locale === 'ar' ? inv.customerNameAr : inv.customerNameEn}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs" dir="ltr">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {formatShortDate(inv.invoiceDate.toDate(), locale)}
                        </td>
                        <td className="px-3 py-2 text-end" dir="ltr">
                          {formatCurrency(inv.total, locale)}
                        </td>
                        <td className="px-3 py-2 text-end text-green-600" dir="ltr">
                          {formatCurrency(inv.paymentAmount || 0, locale)}
                        </td>
                        <td className="px-3 py-2 text-end font-medium text-red-600" dir="ltr">
                          {formatCurrency(outstanding, locale)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {formatNumber(days, locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
