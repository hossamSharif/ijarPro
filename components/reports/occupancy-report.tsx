'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { onSnapshot, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildingsCollection } from '@/lib/firebase/firestore';
import { formatNumber, formatPercentage } from '@/lib/utils/numbers';
import type { Building } from '@/lib/types/models';

type BuildingWithId = Building & { id: string };

export function OccupancyReport() {
  const t = useTranslations('reports.occupancyReport');
  const tReports = useTranslations('reports');
  const locale = useLocale();
  const [buildings, setBuildings] = useState<BuildingWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(buildingsCollection, where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => {
      setBuildings(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totals = buildings.reduce(
    (acc, b) => ({
      apartments: acc.apartments + b.apartmentCount,
      occupied: acc.occupied + b.occupiedCount,
      vacant: acc.vacant + b.vacantCount,
      maintenance: acc.maintenance + b.maintenanceCount,
    }),
    { apartments: 0, occupied: 0, vacant: 0, maintenance: 0 }
  );

  const overallRate = totals.apartments > 0 ? (totals.occupied / totals.apartments) * 100 : 0;

  if (buildings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {tReports('noData')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tReports('occupancy')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-3 py-2 text-start font-medium">{t('building')}</th>
                <th className="px-3 py-2 text-center font-medium">{t('total')}</th>
                <th className="px-3 py-2 text-center font-medium">{t('occupied')}</th>
                <th className="px-3 py-2 text-center font-medium">{t('vacant')}</th>
                <th className="px-3 py-2 text-center font-medium">{t('maintenance')}</th>
                <th className="px-3 py-2 text-center font-medium">{t('rate')}</th>
              </tr>
            </thead>
            <tbody>
              {buildings.map((b) => {
                const rate = b.apartmentCount > 0 ? (b.occupiedCount / b.apartmentCount) * 100 : 0;
                return (
                  <tr key={b.id} className="border-b">
                    <td className="px-3 py-2 font-medium">
                      {locale === 'ar' ? b.nameAr : b.nameEn}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {formatNumber(b.apartmentCount, locale)}
                    </td>
                    <td className="px-3 py-2 text-center text-green-600">
                      {formatNumber(b.occupiedCount, locale)}
                    </td>
                    <td className="px-3 py-2 text-center text-amber-600">
                      {formatNumber(b.vacantCount, locale)}
                    </td>
                    <td className="px-3 py-2 text-center text-blue-600">
                      {formatNumber(b.maintenanceCount, locale)}
                    </td>
                    <td className="px-3 py-2 text-center font-medium">
                      {formatPercentage(rate, locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold">
                <td className="px-3 py-2">{t('total')}</td>
                <td className="px-3 py-2 text-center">
                  {formatNumber(totals.apartments, locale)}
                </td>
                <td className="px-3 py-2 text-center text-green-600">
                  {formatNumber(totals.occupied, locale)}
                </td>
                <td className="px-3 py-2 text-center text-amber-600">
                  {formatNumber(totals.vacant, locale)}
                </td>
                <td className="px-3 py-2 text-center text-blue-600">
                  {formatNumber(totals.maintenance, locale)}
                </td>
                <td className="px-3 py-2 text-center">
                  {formatPercentage(overallRate, locale)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
