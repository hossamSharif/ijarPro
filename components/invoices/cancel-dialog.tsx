'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { cancellationSchema, type CancellationFormData } from '@/lib/validators/invoice';
import { cancelInvoice } from '@/lib/firebase/invoices';
import type { Invoice } from '@/lib/types/models';

interface CancelDialogProps {
  invoice: Invoice & { id: string };
  userId: string;
  userName: string;
}

export function CancelDialog({ invoice, userId, userName }: CancelDialogProps) {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CancellationFormData>({
    resolver: zodResolver(cancellationSchema),
    defaultValues: {
      reason: '',
    },
  });

  const onSubmit = async (data: CancellationFormData) => {
    setSubmitting(true);
    try {
      const result = await cancelInvoice({
        invoiceId: invoice.id,
        reason: data.reason,
        userId,
        userName,
      });
      toast.success(
        `${t('cancelDialog.success')} — ${t('creditNoteCreated')}: ${result.creditNoteNumber}`
      );
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
        <Button variant="destructive">
          {t('cancelInvoice')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('cancelDialog.title')}</DialogTitle>
          <DialogDescription>
            {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {/* Warning */}
            <p className="text-sm text-muted-foreground">
              {t('cancelDialog.warning')}
            </p>

            {/* Reason input */}
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">{t('cancelDialog.reasonLabel')}</Label>
              <Textarea
                id="cancel-reason"
                placeholder={t('cancelDialog.reasonPlaceholder')}
                {...register('reason')}
                rows={3}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">{tErrors('required')}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? tCommon('loading') : t('cancelDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
