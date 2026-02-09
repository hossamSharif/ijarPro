'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

interface BalanceIndicatorProps {
  totalDebits: number;
  totalCredits: number;
}

export function BalanceIndicator({ totalDebits, totalCredits }: BalanceIndicatorProps) {
  const t = useTranslations('journal');
  const locale = useLocale();

  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.01;

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border p-4',
        isBalanced
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
      )}
    >
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t('totalDebits')}</p>
          <p className="text-lg font-semibold" dir="ltr">
            {formatCurrency(totalDebits, locale)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t('totalCredits')}</p>
          <p className="text-lg font-semibold" dir="ltr">
            {formatCurrency(totalCredits, locale)}
          </p>
        </div>
        {!isBalanced && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('difference')}</p>
            <p className="text-lg font-semibold text-red-600" dir="ltr">
              {formatCurrency(difference, locale)}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isBalanced ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">{t('balanced')}</span>
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">{t('unbalanced')}</span>
          </>
        )}
      </div>
    </div>
  );
}
