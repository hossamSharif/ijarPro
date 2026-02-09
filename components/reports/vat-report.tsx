'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { invoicesCollection, expensesCollection } from '@/lib/firebase/firestore';
import { formatCurrency } from '@/lib/utils/currency';
import { formatNumber } from '@/lib/utils/numbers';
import { ReportPdfButton } from './report-pdf';
import type { Invoice, Expense } from '@/lib/types/models';

type InvoiceWithId = Invoice & { id: string };
type ExpenseWithId = Expense & { id: string };

export function VatReport() {
  const t = useTranslations('reports.vatReport');
  const tReports = useTranslations('reports');
  const locale = useLocale();

  const now = new Date();
  const [dateFrom, setDateFrom] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  );
  const [dateTo, setDateTo] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    ).padStart(2, '0')}`
  );

  const [invoices, setInvoices] = useState<InvoiceWithId[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dateFrom) return;
    const from = Timestamp.fromDate(new Date(dateFrom));
    const qInv = query(
      invoicesCollection,
      where('invoiceDate', '>=', from),
      orderBy('invoiceDate', 'desc')
    );
    const unsub1 = onSnapshot(qInv, (snap) => {
      setInvoices(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });

    const qExp = query(
      expensesCollection,
      where('date', '>=', from),
      orderBy('date', 'desc')
    );
    const unsub2 = onSnapshot(qExp, (snap) => {
      setExpenses(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [dateFrom]);

  const vatData = useMemo(() => {
    const toDate = dateTo ? new Date(dateTo) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    // Filter invoices: debit only, not cancelled, within date range
    const filteredInv = invoices.filter((inv) => {
      if (inv.type !== 'debit' || inv.status === 'cancelled') return false;
      if (toDate && inv.invoiceDate.toDate() > toDate) return false;
      return true;
    });

    // Filter expenses within date range
    const filteredExp = expenses.filter((exp) => {
      if (toDate && exp.date.toDate() > toDate) return false;
      return true;
    });

    const salesTotal = filteredInv.reduce((sum, inv) => sum + inv.subtotal, 0);
    const vatCollected = filteredInv.reduce((sum, inv) => sum + inv.vatAmount, 0);
    const purchasesTotal = filteredExp.reduce((sum, exp) => sum + exp.amount, 0);
    const vatPaid = filteredExp.reduce((sum, exp) => sum + (exp.vatAmount || 0), 0);
    const netVat = vatCollected - vatPaid;

    return {
      invoiceCount: filteredInv.length,
      expenseCount: filteredExp.length,
      salesTotal,
      vatCollected,
      purchasesTotal,
      vatPaid,
      netVat,
    };
  }, [invoices, expenses, dateTo]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[160px]"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[160px]"
        />
      </div>

      {/* VAT Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('vatCollected')}</p>
            <p className="text-xl font-bold text-green-600" dir="ltr">
              {formatCurrency(vatData.vatCollected, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('vatPaid')}</p>
            <p className="text-xl font-bold text-red-600" dir="ltr">
              {formatCurrency(vatData.vatPaid, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('netVat')}</p>
            <p
              className={`text-xl font-bold ${vatData.netVat >= 0 ? 'text-blue-600' : 'text-red-600'}`}
              dir="ltr"
            >
              {formatCurrency(vatData.netVat, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{tReports('vat')}</CardTitle>
          <ReportPdfButton
            fileName="vat-report"
            title={tReports('vat')}
            headers={[locale === 'ar' ? 'البند' : 'Item', locale === 'ar' ? 'القيمة' : 'Value']}
            rows={[
              [t('invoiceCount'), String(vatData.invoiceCount)],
              [t('salesTotal'), vatData.salesTotal.toFixed(2)],
              [t('vatCollected'), vatData.vatCollected.toFixed(2)],
              [t('expenseCount'), String(vatData.expenseCount)],
              [t('purchasesTotal'), vatData.purchasesTotal.toFixed(2)],
              [t('vatPaid'), vatData.vatPaid.toFixed(2)],
              [t('netVat'), vatData.netVat.toFixed(2)],
            ]}
            locale={locale}
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-3 font-medium">{t('invoiceCount')}</td>
                  <td className="px-3 py-3 text-end">
                    {formatNumber(vatData.invoiceCount, locale)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-3 font-medium">{t('salesTotal')}</td>
                  <td className="px-3 py-3 text-end" dir="ltr">
                    {formatCurrency(vatData.salesTotal, locale)}
                  </td>
                </tr>
                <tr className="border-b bg-green-50 dark:bg-green-950/20">
                  <td className="px-3 py-3 font-semibold text-green-700 dark:text-green-400">
                    {t('vatCollected')}
                  </td>
                  <td className="px-3 py-3 text-end font-semibold text-green-700 dark:text-green-400" dir="ltr">
                    {formatCurrency(vatData.vatCollected, locale)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-3 font-medium">{t('expenseCount')}</td>
                  <td className="px-3 py-3 text-end">
                    {formatNumber(vatData.expenseCount, locale)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-3 font-medium">{t('purchasesTotal')}</td>
                  <td className="px-3 py-3 text-end" dir="ltr">
                    {formatCurrency(vatData.purchasesTotal, locale)}
                  </td>
                </tr>
                <tr className="border-b bg-red-50 dark:bg-red-950/20">
                  <td className="px-3 py-3 font-semibold text-red-700 dark:text-red-400">
                    {t('vatPaid')}
                  </td>
                  <td className="px-3 py-3 text-end font-semibold text-red-700 dark:text-red-400" dir="ltr">
                    {formatCurrency(vatData.vatPaid, locale)}
                  </td>
                </tr>
                <tr className="border-t-2 bg-blue-50 dark:bg-blue-950/20">
                  <td className="px-3 py-3 text-lg font-bold text-blue-700 dark:text-blue-400">
                    {t('netVat')}
                  </td>
                  <td className="px-3 py-3 text-end text-lg font-bold text-blue-700 dark:text-blue-400" dir="ltr">
                    {formatCurrency(vatData.netVat, locale)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
