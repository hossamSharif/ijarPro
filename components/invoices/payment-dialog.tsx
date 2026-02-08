'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { paymentSchema, type PaymentFormData } from '@/lib/validators/invoice';
import { recordPayment } from '@/lib/firebase/invoices';
import { formatCurrency } from '@/lib/utils/currency';
import type { Invoice } from '@/lib/types/models';

interface PaymentDialogProps {
  invoice: Invoice & { id: string };
  userId: string;
  userName: string;
  locale: string;
}

export function PaymentDialog({ invoice, userId, userName, locale }: PaymentDialogProps) {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentPaid = invoice.paymentAmount ?? 0;
  const remaining = Math.round((invoice.total - currentPaid) * 100) / 100;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: remaining,
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    if (data.amount > remaining) {
      toast.error(t('paymentDialog.exceedsBalance'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await recordPayment({
        invoiceId: invoice.id,
        amount: data.amount,
        userId,
        userName,
      });
      toast.success(t('paymentDialog.success'));
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tErrors('generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          {t('recordPayment')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('paymentDialog.title')}</DialogTitle>
          <DialogDescription>
            {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {/* Invoice summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('paymentDialog.totalLabel')}</span>
                <span className="font-medium">{formatCurrency(invoice.total, locale)}</span>
              </div>
              {currentPaid > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('paymentDialog.paidLabel')}</span>
                  <span className="text-green-600">{formatCurrency(currentPaid, locale)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>{t('paymentDialog.remainingLabel')}</span>
                <span>{formatCurrency(remaining, locale)}</span>
              </div>
            </div>

            {/* Payment amount input */}
            <div className="space-y-2">
              <Label htmlFor="payment-amount">{t('paymentDialog.amountLabel')}</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{tErrors('required')}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? tCommon('loading') : t('paymentDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
