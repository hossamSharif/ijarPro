'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getDoc, getDocs, query, where, orderBy, collection } from 'firebase/firestore';
import { toast } from 'sonner';
import { Plus, Trash2, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { invoiceSchema, type InvoiceFormData } from '@/lib/validators/invoice';
import { updateInvoice } from '@/lib/firebase/invoices';
import { companyRef } from '@/lib/firebase/firestore';
import { formatCurrency } from '@/lib/utils/currency';
import type { Invoice, Customer, Apartment, Building } from '@/lib/types/models';
import { db } from '@/lib/firebase/config';
import { customerConverter, buildingConverter, apartmentConverter } from '@/lib/firebase/firestore';

interface UpdateDialogProps {
  invoice: Invoice & { id: string };
  userId: string;
  userName: string;
  locale: string;
}

export function UpdateDialog({ invoice, userId, userName, locale }: UpdateDialogProps) {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vatRate, setVatRate] = useState(invoice.vatRate);
  const [customer, setCustomer] = useState<(Customer & { id: string }) | null>(null);
  const [apartment, setApartment] = useState<(Apartment & { id: string }) | null>(null);
  const [building, setBuilding] = useState<(Building & { id: string }) | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: invoice.customerId,
      apartmentId: invoice.apartmentId,
      buildingId: invoice.buildingId,
      invoiceDate: new Date(),
      supplyDate: invoice.supplyDate.toDate(),
      rentalPeriodStart: invoice.rentalPeriodStart.toDate(),
      rentalPeriodEnd: invoice.rentalPeriodEnd.toDate(),
      lineItems: invoice.lineItems.map((item) => ({
        descriptionAr: item.descriptionAr,
        descriptionEn: item.descriptionEn,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
      vatRate: invoice.vatRate,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const lineItems = watch('lineItems');

  // Load related entities when dialog opens
  useEffect(() => {
    if (!open) return;

    async function loadData() {
      const [customerSnap, buildingSnap, apartmentSnap, companySnap] = await Promise.all([
        getDoc(
          (await import('@/lib/firebase/firestore')).customerDoc(invoice.customerId)
        ),
        getDoc(
          (await import('@/lib/firebase/firestore')).buildingDoc(invoice.buildingId)
        ),
        getDoc(
          (await import('@/lib/firebase/firestore')).apartmentDoc(invoice.apartmentId)
        ),
        getDoc(companyRef),
      ]);

      if (customerSnap.exists()) {
        setCustomer({ ...customerSnap.data(), id: customerSnap.id });
      }
      if (buildingSnap.exists()) {
        setBuilding({ ...buildingSnap.data(), id: buildingSnap.id });
      }
      if (apartmentSnap.exists()) {
        setApartment({ ...apartmentSnap.data(), id: apartmentSnap.id });
      }
      if (companySnap.exists()) {
        const rate = companySnap.data().vatRate ?? 15;
        setVatRate(rate);
        setValue('vatRate', rate);
      }
    }
    loadData();
  }, [open, invoice.customerId, invoice.buildingId, invoice.apartmentId, setValue]);

  const updateLineItemAmount = (index: number) => {
    const qty = lineItems[index]?.quantity ?? 0;
    const price = lineItems[index]?.unitPrice ?? 0;
    const amount = Math.round(qty * price * 100) / 100;
    setValue(`lineItems.${index}.amount`, amount);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  const onSubmit = async (data: InvoiceFormData) => {
    if (!customer || !apartment || !building) {
      toast.error(tErrors('generic'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await updateInvoice({
        originalInvoiceId: invoice.id,
        data,
        customer,
        apartment,
        building,
        userId,
        userName,
      });

      toast.success(
        `${t('updateDialog.success')} — ${t('newInvoiceCreated')}: ${result.newInvoiceNumber}`
      );
      setOpen(false);
      router.push(`/invoices/${result.newInvoiceId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tErrors('generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="me-2 h-4 w-4" />
          {t('updateInvoice')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('updateDialog.title')}</DialogTitle>
          <DialogDescription>
            {invoice.invoiceNumber} — {t('updateDialog.warning')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {/* Dates */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('supplyDate')}</Label>
                <Input
                  type="date"
                  {...register('supplyDate', { valueAsDate: true })}
                  defaultValue={invoice.supplyDate.toDate().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('from')}</Label>
                <Input
                  type="date"
                  {...register('rentalPeriodStart', { valueAsDate: true })}
                  defaultValue={invoice.rentalPeriodStart.toDate().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('to')}</Label>
                <Input
                  type="date"
                  {...register('rentalPeriodEnd', { valueAsDate: true })}
                  defaultValue={invoice.rentalPeriodEnd.toDate().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{t('lineItems')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      descriptionAr: '',
                      descriptionEn: '',
                      quantity: 1,
                      unitPrice: 0,
                      amount: 0,
                    })
                  }
                >
                  <Plus className="me-1 h-4 w-4" />
                  {tCommon('add')}
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-2 rounded-lg border p-3">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('descriptionAr')}</Label>
                      <Input
                        {...register(`lineItems.${index}.descriptionAr`)}
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('descriptionEn')}</Label>
                      <Input
                        {...register(`lineItems.${index}.descriptionEn`)}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('quantity')}</Label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                        onChange={(e) => {
                          register(`lineItems.${index}.quantity`).onChange(e);
                          setTimeout(() => updateLineItemAmount(index), 0);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('unitPrice')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                        onChange={(e) => {
                          register(`lineItems.${index}.unitPrice`).onChange(e);
                          setTimeout(() => updateLineItemAmount(index), 0);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('amount')}</Label>
                      <Input
                        type="number"
                        readOnly
                        value={lineItems[index]?.amount ?? 0}
                        className="bg-muted"
                      />
                    </div>
                    <div className="flex items-end">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span>{formatCurrency(subtotal, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('vatRate')} ({vatRate}%)
                </span>
                <span>{formatCurrency(vatAmount, locale)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>{t('total')}</span>
                <span>{formatCurrency(total, locale)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? tCommon('loading') : t('updateDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
