'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/hooks/use-auth';
import { OccupancyReport } from '@/components/reports/occupancy-report';
import { RevenueReport } from '@/components/reports/revenue-report';
import { ExpenseReport } from '@/components/reports/expense-report';
import { AgingReport } from '@/components/reports/aging-report';
import { VatReport } from '@/components/reports/vat-report';

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
