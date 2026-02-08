'use client';

import { useTranslations } from 'next-intl';
import { InvoiceForm } from '@/components/invoices/invoice-form';

export default function NewInvoicePage() {
  const t = useTranslations('invoices');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">{t('createInvoice')}</h1>
      <InvoiceForm />
    </div>
  );
}
