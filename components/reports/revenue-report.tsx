'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { invoicesCollection, buildingsCollection } from '@/lib/firebase/firestore';
import { formatCurrency } from '@/lib/utils/currency';
import { formatNumber } from '@/lib/utils/numbers';
import { ReportPdfButton } from './report-pdf';
import type { Invoice, Building } from '@/lib/types/models';

type InvoiceWithId = Invoice & { id: string };
type BuildingWithId = Building & { id: string };

export function RevenueReport() {
  const t = useTranslations('reports.revenueReport');
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
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [invoices, setInvoices] = useState<InvoiceWithId[]>([]);
  const [buildings, setBuildings] = useState<BuildingWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(buildingsCollection, where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => {
      setBuildings(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!dateFrom) return;
    const from = Timestamp.fromDate(new Date(dateFrom));
    const q = query(
      invoicesCollection,
      where('invoiceDate', '>=', from),
      orderBy('invoiceDate', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return () => unsub();
  }, [dateFrom]);

  const filtered = useMemo(() => {
    let result = invoices.filter(
      (inv) => inv.type === 'debit' && inv.status !== 'cancelled'
    );
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((inv) => inv.invoiceDate.toDate() <= to);
    }
    if (buildingFilter !== 'all') {
      result = result.filter((inv) => inv.buildingId === buildingFilter);
    }
    return result;
  }, [invoices, dateTo, buildingFilter]);

  // Group by building
  const byBuilding = useMemo(() => {
    const map = new Map<
      string,
      { nameAr: string; nameEn: string; count: number; subtotal: number; vat: number; total: number; paid: number }
    >();
    for (const inv of filtered) {
      const existing = map.get(inv.buildingId) || {
        nameAr: inv.buildingNameAr,
        nameEn: inv.buildingNameAr,
        count: 0,
        subtotal: 0,
        vat: 0,
        total: 0,
        paid: 0,
      };
      existing.count++;
      existing.subtotal += inv.subtotal;
      existing.vat += inv.vatAmount;
      existing.total += inv.total;
      existing.paid += inv.paymentAmount || 0;
      map.set(inv.buildingId, existing);
    }

    // Enrich with building names
    for (const b of buildings) {
      const entry = map.get(b.id);
      if (entry) {
        entry.nameAr = b.nameAr;
        entry.nameEn = b.nameEn;
      }
    }

    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }));
  }, [filtered, buildings]);

  const totals = byBuilding.reduce(
    (acc, r) => ({
      count: acc.count + r.count,
      subtotal: acc.subtotal + r.subtotal,
      vat: acc.vat + r.vat,
      total: acc.total + r.total,
      paid: acc.paid + r.paid,
    }),
    { count: 0, subtotal: 0, vat: 0, total: 0, paid: 0 }
  );

  // Chart data
  const chartData = byBuilding.map((r) => ({
    name: locale === 'ar' ? r.nameAr : r.nameEn,
    total: r.total,
    paid: r.paid,
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
        <Select value={buildingFilter} onValueChange={setBuildingFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={tReports('allBuildings')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tReports('allBuildings')}</SelectItem>
            {buildings.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {locale === 'ar' ? b.nameAr : b.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{tReports('revenue')}</CardTitle>
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
                <Legend />
                <Bar dataKey="total" name={t('total')} fill="#2563eb" />
                <Bar dataKey="paid" name={t('paid')} fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{tReports('revenue')}</CardTitle>
          {byBuilding.length > 0 && (
            <ReportPdfButton
              fileName="revenue-report"
              title={tReports('revenue')}
              headers={[
                t('building'),
                t('invoiceCount'),
                t('subtotal'),
                t('vat'),
                t('total'),
                t('paid'),
                t('outstanding'),
              ]}
              rows={byBuilding.map((row) => [
                locale === 'ar' ? row.nameAr : row.nameEn,
                String(row.count),
                row.subtotal.toFixed(2),
                row.vat.toFixed(2),
                row.total.toFixed(2),
                row.paid.toFixed(2),
                (row.total - row.paid).toFixed(2),
              ])}
              footerRow={[
                t('total'),
                String(totals.count),
                totals.subtotal.toFixed(2),
                totals.vat.toFixed(2),
                totals.total.toFixed(2),
                totals.paid.toFixed(2),
                (totals.total - totals.paid).toFixed(2),
              ]}
              locale={locale}
            />
          )}
        </CardHeader>
        <CardContent>
          {byBuilding.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {tReports('noData')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-3 py-2 text-start font-medium">{t('building')}</th>
                    <th className="px-3 py-2 text-center font-medium">{t('invoiceCount')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('subtotal')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('vat')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('total')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('paid')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('outstanding')}</th>
                  </tr>
                </thead>
                <tbody>
                  {byBuilding.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="px-3 py-2 font-medium">
                        {locale === 'ar' ? row.nameAr : row.nameEn}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {formatNumber(row.count, locale)}
                      </td>
                      <td className="px-3 py-2 text-end" dir="ltr">
                        {formatCurrency(row.subtotal, locale)}
                      </td>
                      <td className="px-3 py-2 text-end" dir="ltr">
                        {formatCurrency(row.vat, locale)}
                      </td>
                      <td className="px-3 py-2 text-end font-medium" dir="ltr">
                        {formatCurrency(row.total, locale)}
                      </td>
                      <td className="px-3 py-2 text-end text-green-600" dir="ltr">
                        {formatCurrency(row.paid, locale)}
                      </td>
                      <td className="px-3 py-2 text-end text-red-600" dir="ltr">
                        {formatCurrency(row.total - row.paid, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="px-3 py-2">{t('total')}</td>
                    <td className="px-3 py-2 text-center">
                      {formatNumber(totals.count, locale)}
                    </td>
                    <td className="px-3 py-2 text-end" dir="ltr">
                      {formatCurrency(totals.subtotal, locale)}
                    </td>
                    <td className="px-3 py-2 text-end" dir="ltr">
                      {formatCurrency(totals.vat, locale)}
                    </td>
                    <td className="px-3 py-2 text-end" dir="ltr">
                      {formatCurrency(totals.total, locale)}
                    </td>
                    <td className="px-3 py-2 text-end text-green-600" dir="ltr">
                      {formatCurrency(totals.paid, locale)}
                    </td>
                    <td className="px-3 py-2 text-end text-red-600" dir="ltr">
                      {formatCurrency(totals.total - totals.paid, locale)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
