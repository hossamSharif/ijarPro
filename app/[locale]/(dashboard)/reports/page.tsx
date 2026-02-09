'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/hooks/use-auth';

const ReportSkeleton = () => (
  <div className="space-y-4 pt-4">
    <div className="h-6 w-32 animate-pulse rounded bg-muted" />
    <div className="h-64 animate-pulse rounded-lg bg-muted" />
  </div>
);

const OccupancyReport = dynamic(
  () => import('@/components/reports/occupancy-report').then((m) => m.OccupancyReport),
  { loading: () => <ReportSkeleton /> }
);

const RevenueReport = dynamic(
  () => import('@/components/reports/revenue-report').then((m) => m.RevenueReport),
  { ssr: false, loading: () => <ReportSkeleton /> }
);

const ExpenseReport = dynamic(
  () => import('@/components/reports/expense-report').then((m) => m.ExpenseReport),
  { ssr: false, loading: () => <ReportSkeleton /> }
);

const AgingReport = dynamic(
  () => import('@/components/reports/aging-report').then((m) => m.AgingReport),
  { ssr: false, loading: () => <ReportSkeleton /> }
);

const VatReport = dynamic(
  () => import('@/components/reports/vat-report').then((m) => m.VatReport),
  { loading: () => <ReportSkeleton /> }
);

export default function ReportsPage() {
  const t = useTranslations('reports');
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('occupancy');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="occupancy">{t('occupancy')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('revenue')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('expenses')}</TabsTrigger>
          <TabsTrigger value="aging">{t('aging')}</TabsTrigger>
          <TabsTrigger value="vat">{t('vat')}</TabsTrigger>
        </TabsList>

        <TabsContent value="occupancy">
          <OccupancyReport />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueReport />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpenseReport />
        </TabsContent>

        <TabsContent value="aging">
          <AgingReport />
        </TabsContent>

        <TabsContent value="vat">
          <VatReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
