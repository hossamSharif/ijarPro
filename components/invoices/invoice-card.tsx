'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';
import { formatShortDate } from '@/lib/utils/dates';
import type { Invoice, InvoiceStatus } from '@/lib/types/models';

const statusVariants: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  issued: 'default',
  paid: 'default',
  partially_paid: 'outline',
  overdue: 'destructive',
  cancelled: 'secondary',
};

interface InvoiceCardProps {
  invoice: Invoice & { id: string };
  onClick?: () => void;
}

export function InvoiceCard({ invoice, onClick }: InvoiceCardProps) {
  const t = useTranslations('invoices');
  const locale = useLocale();

  const customerName = locale === 'ar' ? invoice.customerNameAr : invoice.customerNameEn;

  return (
    <Card
      className={onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">
                {invoice.invoiceNumber}
              </span>
              <Badge variant={statusVariants[invoice.status]}>
                {t(`status.${invoice.status}`)}
              </Badge>
              {invoice.type === 'credit' && (
                <Badge variant="outline">{t('type.credit')}</Badge>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {customerName}
            </p>
            <p className="text-xs text-muted-foreground">
              {invoice.buildingNameAr} — {invoice.apartmentUnit}
            </p>
          </div>
          <div className="text-end">
            <p className="font-semibold">
              {formatCurrency(invoice.total, locale)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatShortDate(invoice.invoiceDate.toDate(), locale)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
