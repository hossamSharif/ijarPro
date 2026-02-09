'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
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
import { expensesCollection, buildingsCollection } from '@/lib/firebase/firestore';
import { formatCurrency } from '@/lib/utils/currency';
import { formatNumber } from '@/lib/utils/numbers';
import { ReportPdfButton } from './report-pdf';
import type { Expense, Building } from '@/lib/types/models';

type ExpenseWithId = Expense & { id: string };
type BuildingWithId = Building & { id: string };

const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ea580c', '#9333ea',
  '#0891b2', '#ca8a04', '#e11d48', '#4f46e5', '#059669',
];

export function ExpenseReport() {
  const t = useTranslations('reports.expenseReport');
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
  const [expenses, setExpenses] = useState<ExpenseWithId[]>([]);
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
      expensesCollection,
      where('date', '>=', from),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return () => unsub();
  }, [dateFrom]);

  const filtered = useMemo(() => {
    let result = expenses;
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((exp) => exp.date.toDate() <= to);
    }
    if (buildingFilter !== 'all') {
      result = result.filter((exp) => exp.buildingId === buildingFilter);
    }
    return result;
  }, [expenses, dateTo, buildingFilter]);

  // Group by category
  const byCategory = useMemo(() => {
    const map = new Map<string, { count: number; amount: number; vat: number }>();
    for (const exp of filtered) {
      const existing = map.get(exp.category) || { count: 0, amount: 0, vat: 0 };
      existing.count++;
      existing.amount += exp.amount;
      existing.vat += exp.vatAmount || 0;
      map.set(exp.category, existing);
    }
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  // Group by building
  const byBuilding = useMemo(() => {
    const map = new Map<string, { nameAr: string; nameEn: string; count: number; amount: number; vat: number }>();
    for (const exp of filtered) {
      const bid = exp.buildingId || '__none__';
      const existing = map.get(bid) || {
        nameAr: '—',
        nameEn: '—',
        count: 0,
        amount: 0,
        vat: 0,
      };
      existing.count++;
      existing.amount += exp.amount;
      existing.vat += exp.vatAmount || 0;
      map.set(bid, existing);
    }
    for (const b of buildings) {
      const entry = map.get(b.id);
      if (entry) {
        entry.nameAr = b.nameAr;
        entry.nameEn = b.nameEn;
      }
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, buildings]);

  const totals = filtered.reduce(
    (acc, exp) => ({
      count: acc.count + 1,
      amount: acc.amount + exp.amount,
      vat: acc.vat + (exp.vatAmount || 0),
    }),
    { count: 0, amount: 0, vat: 0 }
  );

  const chartData = byCategory.map((r) => ({
    name: r.category,
    value: r.amount,
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
            <CardTitle>{t('byCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value), locale)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* By Category Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('byCategory')}</CardTitle>
          {byCategory.length > 0 && (
            <ReportPdfButton
              fileName="expense-report"
              title={tReports('expenses')}
              headers={[t('category'), t('count'), t('amount'), t('vatAmount'), t('total')]}
              rows={byCategory.map((row) => [
                row.category,
                String(row.count),
                row.amount.toFixed(2),
                row.vat.toFixed(2),
                (row.amount + row.vat).toFixed(2),
              ])}
              footerRow={[
                t('total'),
                String(totals.count),
                totals.amount.toFixed(2),
                totals.vat.toFixed(2),
                (totals.amount + totals.vat).toFixed(2),
              ]}
              locale={locale}
            />
          )}
        </CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {tReports('noData')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-3 py-2 text-start font-medium">{t('category')}</th>
                    <th className="px-3 py-2 text-center font-medium">{t('count')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('amount')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('vatAmount')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((row) => (
                    <tr key={row.category} className="border-b">
                      <td className="px-3 py-2 font-medium">{row.category}</td>
                      <td className="px-3 py-2 text-center">
                        {formatNumber(row.count, locale)}
                      </td>
                      <td className="px-3 py-2 text-end" dir="ltr">
                        {formatCurrency(row.amount, locale)}
                      </td>
                      <td className="px-3 py-2 text-end" dir="ltr">
                        {formatCurrency(row.vat, locale)}
                      </td>
                      <td className="px-3 py-2 text-end font-medium" dir="ltr">
                        {formatCurrency(row.amount + row.vat, locale)}
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
                      {formatCurrency(totals.amount, locale)}
                    </td>
                    <td className="px-3 py-2 text-end" dir="ltr">
                      {formatCurrency(totals.vat, locale)}
                    </td>
                    <td className="px-3 py-2 text-end" dir="ltr">
                      {formatCurrency(totals.amount + totals.vat, locale)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Building Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('byBuilding')}</CardTitle>
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
                    <th className="px-3 py-2 text-center font-medium">{t('count')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('amount')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('vatAmount')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('total')}</th>
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
                        {formatCurrency(row.amount, locale)}
                      </td>
                      <td className="px-3 py-2 text-end" dir="ltr">
                        {formatCurrency(row.vat, locale)}
                      </td>
                      <td className="px-3 py-2 text-end font-medium" dir="ltr">
                        {formatCurrency(row.amount + row.vat, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
