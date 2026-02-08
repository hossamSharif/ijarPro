'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { onSnapshot } from 'firebase/firestore';
import { ArrowRight, FileText, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { ZatcaQr } from '@/components/invoices/zatca-qr';
import { invoiceDoc } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/hooks/use-auth';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDualDate, formatShortDate } from '@/lib/utils/dates';
import type { Invoice, InvoiceStatus } from '@/lib/types/models';

const statusVariants: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  issued: 'default',
  paid: 'default',
  partially_paid: 'outline',
  overdue: 'destructive',
  cancelled: 'secondary',
};

type InvoiceWithId = Invoice & { id: string };

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { isAdmin, userProfile } = useAuth();

  const [invoice, setInvoice] = useState<InvoiceWithId | null>(null);
  const [loading, setLoading] = useState(true);

  const invoiceId = params.id as string;

  useEffect(() => {
    const ref = invoiceDoc(invoiceId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setInvoice({ ...snap.data(), id: snap.id });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{tCommon('noResults')}</p>
        <Button variant="outline" onClick={() => router.push('/invoices')}>
          {tCommon('back')}
        </Button>
      </div>
    );
  }

  const customerName = locale === 'ar' ? invoice.customerNameAr : invoice.customerNameEn;
  const remainingBalance = invoice.total - (invoice.paymentAmount ?? 0);

  // Permission checks for action buttons
  const canUpdate = isAdmin || userProfile?.permissions?.canUpdateInvoice;
  const canCancel = isAdmin || userProfile?.permissions?.canCancelInvoice;
  const canPay = isAdmin || userProfile?.permissions?.canRecordPayment;
  const showUpdateBtn = canUpdate && ['draft', 'issued'].includes(invoice.status);
  const showCancelBtn = canCancel && !['paid', 'cancelled'].includes(invoice.status);
  const showPayBtn = canPay && ['issued', 'partially_paid', 'overdue'].includes(invoice.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{invoice.invoiceNumber}</h1>
            <Badge variant={statusVariants[invoice.status]}>
              {t(`status.${invoice.status}`)}
            </Badge>
            {invoice.type === 'credit' && (
              <Badge variant="outline">{t('type.credit')}</Badge>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">{customerName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/invoices')}>
            {tCommon('back')}
          </Button>
        </div>
      </div>

      {/* Invoice Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('invoiceDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('invoiceNumber')}</span>
              <span className="font-mono">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('customer')}</span>
              <span>{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('building')}</span>
              <span>{invoice.buildingNameAr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('apartment')}</span>
              <span>{invoice.apartmentUnit}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('invoiceDate')}</span>
              <span>{formatDualDate(invoice.invoiceDate.toDate(), locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('supplyDate')}</span>
              <span>{formatShortDate(invoice.supplyDate.toDate(), locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('rentalPeriod')}</span>
              <span>
                {formatShortDate(invoice.rentalPeriodStart.toDate(), locale)}
                {' '}
                <ArrowRight className="inline h-3 w-3" />
                {' '}
                {formatShortDate(invoice.rentalPeriodEnd.toDate(), locale)}
              </span>
            </div>
            {invoice.originalInvoiceNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Invoice</span>
                <span className="font-mono">{invoice.originalInvoiceNumber}</span>
              </div>
            )}
            {invoice.cancellationReason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('cancellationReason')}</span>
                <span>{invoice.cancellationReason}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ZATCA QR Code */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center pt-6">
            <ZatcaQr data={invoice.zatcaQrData} size={180} />
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('lineItems')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === 'ar' ? t('descriptionAr') : t('descriptionEn')}</TableHead>
                  <TableHead className="text-center">{t('quantity')}</TableHead>
                  <TableHead className="text-end">{t('unitPrice')}</TableHead>
                  <TableHead className="text-end">{t('amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {locale === 'ar' ? item.descriptionAr : item.descriptionEn}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-end">
                      {formatCurrency(item.unitPrice, locale)}
                    </TableCell>
                    <TableCell className="text-end">
                      {formatCurrency(item.amount, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('subtotal')}</span>
              <span>{formatCurrency(invoice.subtotal, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('vatRate')} ({invoice.vatRate}%)</span>
              <span>{formatCurrency(invoice.vatAmount, locale)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>{t('total')}</span>
              <span>{formatCurrency(invoice.total, locale)}</span>
            </div>
            {invoice.paymentAmount !== undefined && invoice.paymentAmount > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>{t('paymentAmount')}</span>
                  <span>{formatCurrency(invoice.paymentAmount, locale)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{t('remainingBalance')}</span>
                  <span>{formatCurrency(remainingBalance, locale)}</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status History */}
      {invoice.statusHistory && invoice.statusHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tCommon('status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoice.statusHistory.map((change, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <Badge variant={statusVariants[change.status]} className="min-w-[80px] justify-center">
                    {t(`status.${change.status}`)}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatShortDate(change.timestamp.toDate(), locale)}
                  </span>
                  {change.note && <span className="text-muted-foreground">— {change.note}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => {/* PDF generation - T090 */}}>
          <Printer className="me-2 h-4 w-4" />
          {t('printPdf')}
        </Button>
        {showPayBtn && (
          <Button variant="default">
            {t('recordPayment')}
          </Button>
        )}
        {showUpdateBtn && (
          <Button variant="outline">
            <FileText className="me-2 h-4 w-4" />
            {t('updateInvoice')}
          </Button>
        )}
        {showCancelBtn && (
          <Button variant="destructive">
            {t('cancelInvoice')}
          </Button>
        )}
      </div>
    </div>
  );
}
