'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getDocs, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import { invoiceSchema, type InvoiceFormData } from '@/lib/validators/invoice';
import { getActiveCustomersQuery } from '@/lib/firebase/customers';
import { createInvoice } from '@/lib/firebase/invoices';
import { companyRef } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/hooks/use-auth';
import { formatCurrency } from '@/lib/utils/currency';
import type { Customer, Apartment, Building } from '@/lib/types/models';

import { query, where, orderBy, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { buildingConverter, apartmentConverter } from '@/lib/firebase/firestore';

interface CustomerWithId extends Customer {
  id: string;
}

interface ApartmentWithId extends Apartment {
  id: string;
}

interface BuildingWithId extends Building {
  id: string;
}

export function InvoiceForm() {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const tSync = useTranslations('sync');
  const locale = useLocale();
  const router = useRouter();
  const { firebaseUser, userProfile } = useAuth();

  const [customers, setCustomers] = useState<CustomerWithId[]>([]);
  const [buildings, setBuildings] = useState<BuildingWithId[]>([]);
  const [apartments, setApartments] = useState<ApartmentWithId[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithId | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingWithId | null>(null);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentWithId | null>(null);
  const [vatRate, setVatRate] = useState(15);
  const [submitting, setSubmitting] = useState(false);

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
      customerId: '',
      apartmentId: '',
      buildingId: '',
      invoiceDate: new Date(),
      supplyDate: new Date(),
      rentalPeriodStart: new Date(),
      rentalPeriodEnd: new Date(),
      lineItems: [
        {
          descriptionAr: '',
          descriptionEn: '',
          quantity: 1,
          unitPrice: 0,
          amount: 0,
        },
      ],
      vatRate: 15,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const lineItems = watch('lineItems');

  // Load customers, buildings, company VAT rate
  useEffect(() => {
    async function loadData() {
      const [customersSnap, buildingsSnap, companySnap] = await Promise.all([
        getDocs(getActiveCustomersQuery()),
        getDocs(query(
          collection(db, 'buildings').withConverter(buildingConverter),
          where('status', '==', 'active'),
          orderBy('nameAr')
        )),
        getDoc(companyRef),
      ]);

      setCustomers(customersSnap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setBuildings(buildingsSnap.docs.map((d) => ({ ...d.data(), id: d.id })));

      if (companySnap.exists()) {
        const rate = companySnap.data().vatRate ?? 15;
        setVatRate(rate);
        setValue('vatRate', rate);
      }
    }
    loadData();
  }, [setValue]);

  // When customer is selected, auto-populate apartment if linked
  const onCustomerChange = useCallback(
    async (customerId: string) => {
      setValue('customerId', customerId);
      const customer = customers.find((c) => c.id === customerId) ?? null;
      setSelectedCustomer(customer);

      if (customer?.currentApartmentId && customer?.currentBuildingId) {
        // Auto-populate building and apartment
        setValue('buildingId', customer.currentBuildingId);
        setValue('apartmentId', customer.currentApartmentId);

        const building = buildings.find((b) => b.id === customer.currentBuildingId) ?? null;
        setSelectedBuilding(building);

        // Load apartments for this building
        const aptsSnap = await getDocs(query(
          collection(db, 'apartments').withConverter(apartmentConverter),
          where('buildingId', '==', customer.currentBuildingId),
          orderBy('unitNumber')
        ));
        const apts = aptsSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
        setApartments(apts);

        const apt = apts.find((a) => a.id === customer.currentApartmentId) ?? null;
        setSelectedApartment(apt);

        // Auto-fill first line item with monthly rent
        if (apt && fields.length > 0) {
          setValue('lineItems.0.descriptionAr', 'إيجار شهري');
          setValue('lineItems.0.descriptionEn', 'Monthly Rent');
          setValue('lineItems.0.quantity', 1);
          setValue('lineItems.0.unitPrice', apt.monthlyRent);
          setValue('lineItems.0.amount', apt.monthlyRent);
        }
      } else {
        setSelectedBuilding(null);
        setSelectedApartment(null);
        setApartments([]);
        setValue('buildingId', '');
        setValue('apartmentId', '');
      }
    },
    [customers, buildings, fields.length, setValue]
  );

  // When building changes, load apartments
  const onBuildingChange = useCallback(
    async (buildingId: string) => {
      setValue('buildingId', buildingId);
      const building = buildings.find((b) => b.id === buildingId) ?? null;
      setSelectedBuilding(building);

      const aptsSnap = await getDocs(query(
        collection(db, 'apartments').withConverter(apartmentConverter),
        where('buildingId', '==', buildingId),
        orderBy('unitNumber')
      ));
      const apts = aptsSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
      setApartments(apts);
      setSelectedApartment(null);
      setValue('apartmentId', '');
    },
    [buildings, setValue]
  );

  const onApartmentChange = useCallback(
    (apartmentId: string) => {
      setValue('apartmentId', apartmentId);
      const apt = apartments.find((a) => a.id === apartmentId) ?? null;
      setSelectedApartment(apt);
    },
    [apartments, setValue]
  );

  // Calculate line item amount
  const updateLineItemAmount = (index: number) => {
    const qty = lineItems[index]?.quantity ?? 0;
    const price = lineItems[index]?.unitPrice ?? 0;
    const amount = Math.round(qty * price * 100) / 100;
    setValue(`lineItems.${index}.amount`, amount);
  };

  // Totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  const onSubmit = async (data: InvoiceFormData) => {
    if (!firebaseUser || !userProfile || !selectedCustomer || !selectedApartment || !selectedBuilding) {
      toast.error(tErrors('generic'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await createInvoice({
        data,
        customer: selectedCustomer,
        apartment: selectedApartment,
        building: selectedBuilding,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });

      if (result.isOffline) {
        toast.info(tSync('offlineInvoice'));
      }
      toast.success(`${t('createInvoice')} — ${result.invoiceNumber}`);
      router.push(`/invoices/${result.invoiceId}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'PENDING_WRITES_LIMIT') {
        toast.error(tSync('atLimit'));
        return;
      }
      toast.error(error instanceof Error ? error.message : tErrors('generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer & Property Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('customer')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Customer Select */}
            <div className="space-y-2">
              <Label>{t('customer')}</Label>
              <Select onValueChange={onCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('customer')} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {locale === 'ar' ? c.nameAr : c.nameEn} — {c.nationalId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && (
                <p className="text-sm text-destructive">{tErrors('required')}</p>
              )}
            </div>

            {/* Building Select */}
            <div className="space-y-2">
              <Label>{t('building')}</Label>
              <Select
                value={watch('buildingId') || undefined}
                onValueChange={onBuildingChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('building')} />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {locale === 'ar' ? b.nameAr : b.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.buildingId && (
                <p className="text-sm text-destructive">{tErrors('required')}</p>
              )}
            </div>

            {/* Apartment Select */}
            <div className="space-y-2">
              <Label>{t('apartment')}</Label>
              <Select
                value={watch('apartmentId') || undefined}
                onValueChange={onApartmentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('apartment')} />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.unitNumber} — {formatCurrency(a.monthlyRent, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.apartmentId && (
                <p className="text-sm text-destructive">{tErrors('required')}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle>{t('rentalPeriod')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('invoiceDate')}</Label>
              <Input
                type="date"
                {...register('invoiceDate', { valueAsDate: true })}
                defaultValue={new Date().toISOString().split('T')[0]}
              />
              {errors.invoiceDate && (
                <p className="text-sm text-destructive">{tErrors('required')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('supplyDate')}</Label>
              <Input
                type="date"
                {...register('supplyDate', { valueAsDate: true })}
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('from')}</Label>
              <Input
                type="date"
                {...register('rentalPeriodStart', { valueAsDate: true })}
              />
              {errors.rentalPeriodStart && (
                <p className="text-sm text-destructive">{tErrors('required')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('to')}</Label>
              <Input
                type="date"
                {...register('rentalPeriodEnd', { valueAsDate: true })}
              />
              {errors.rentalPeriodEnd && (
                <p className="text-sm text-destructive">{tErrors('required')}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('lineItems')}</CardTitle>
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
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-3 rounded-lg border p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t('descriptionAr')}</Label>
                  <Input
                    {...register(`lineItems.${index}.descriptionAr`)}
                    dir="rtl"
                  />
                  {errors.lineItems?.[index]?.descriptionAr && (
                    <p className="text-sm text-destructive">{tErrors('required')}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>{t('descriptionEn')}</Label>
                  <Input
                    {...register(`lineItems.${index}.descriptionEn`)}
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label>{t('quantity')}</Label>
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
                  <Label>{t('unitPrice')}</Label>
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
                  <Label>{t('amount')}</Label>
                  <Input
                    type="number"
                    step="0.01"
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
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('subtotal')}</span>
              <span className="font-medium">{formatCurrency(subtotal, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('vatRate')} ({vatRate}%)
              </span>
              <span className="font-medium">{formatCurrency(vatAmount, locale)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>{t('total')}</span>
              <span>{formatCurrency(total, locale)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? tCommon('loading') : t('createInvoice')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  );
}
