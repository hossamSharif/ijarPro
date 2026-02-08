'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getDocs, onSnapshot, query, where, orderBy, collection } from 'firebase/firestore';
import { toast } from 'sonner';
import { Save, Upload, X, FileIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { expenseSchema, type ExpenseFormData } from '@/lib/validators/expense';
import { createExpense } from '@/lib/firebase/expenses';
import { companyRef, buildingConverter, apartmentConverter } from '@/lib/firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { Building, Apartment } from '@/lib/types/models';

type BuildingWithId = Building & { id: string };
type ApartmentWithId = Apartment & { id: string };

export default function NewExpensePage() {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const tToasts = useTranslations('toasts');
  const locale = useLocale();
  const router = useRouter();
  const { firebaseUser, userProfile } = useAuth();

  const [categories, setCategories] = useState<string[]>([]);
  const [buildings, setBuildings] = useState<BuildingWithId[]>([]);
  const [apartments, setApartments] = useState<ApartmentWithId[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      category: '',
      amount: 0,
      vatAmount: undefined,
      description: '',
      buildingId: undefined,
      apartmentId: undefined,
    },
  });

  const selectedBuildingId = form.watch('buildingId');

  // Load expense categories from company profile
  useEffect(() => {
    const unsub = onSnapshot(companyRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCategories(data.expenseCategories || []);
      }
    });
    return () => unsub();
  }, []);

  // Load buildings
  useEffect(() => {
    const q = query(
      collection(db, 'buildings').withConverter(buildingConverter),
      where('status', '==', 'active'),
      orderBy('nameAr')
    );
    getDocs(q).then((snap) => {
      setBuildings(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
  }, []);

  // Load apartments when building changes
  useEffect(() => {
    if (!selectedBuildingId) {
      setApartments([]);
      return;
    }
    const q = query(
      collection(db, 'apartments').withConverter(apartmentConverter),
      where('buildingId', '==', selectedBuildingId),
      orderBy('unitNumber')
    );
    getDocs(q).then((snap) => {
      setApartments(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
  }, [selectedBuildingId]);

  const handleReceiptChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('receiptHint'));
      return;
    }

    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReceiptPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  }, [t]);

  const removeReceipt = useCallback(() => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const onSubmit = async (data: ExpenseFormData) => {
    if (!firebaseUser || !userProfile) return;

    try {
      await createExpense({
        data,
        receiptFile,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });

      toast.success(t('expenseCreated'));
      router.push('/expenses');
    } catch {
      toast.error(tToasts('error'));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{t('addExpense')}</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('addExpense')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Date */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('date')}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val ? new Date(val) : new Date());
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('category')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectCategory')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('amount')} ({tCommon('currency')})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          dir="ltr"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* VAT Amount */}
                <FormField
                  control={form.control}
                  name="vatAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vatAmount')} ({tCommon('currency')})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          dir="ltr"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val ? parseFloat(val) : undefined);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Building & Apartment Association */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('building')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Building */}
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('building')}</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val === '__none__' ? undefined : val);
                          form.setValue('apartmentId', undefined);
                        }}
                        value={field.value ?? '__none__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectBuilding')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {buildings.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {locale === 'ar' ? b.nameAr : b.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Apartment */}
                <FormField
                  control={form.control}
                  name="apartmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('apartment')}</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === '__none__' ? undefined : val)}
                        value={field.value ?? '__none__'}
                        disabled={!selectedBuildingId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectApartment')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {apartments.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.unitNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Receipt Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('receipt')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {receiptFile ? (
                  <div className="flex items-center gap-3">
                    {receiptPreview ? (
                      <div className="relative h-16 w-16 rounded-lg border overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={receiptPreview}
                          alt="Receipt"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted">
                        <FileIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{receiptFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(receiptFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeReceipt}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="me-2 h-4 w-4" />
                      {t('uploadReceipt')}
                    </Button>
                    <p className="text-xs text-muted-foreground">{t('receiptHint')}</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleReceiptChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Save className="me-2 h-4 w-4" />
              {form.formState.isSubmitting ? tCommon('loading') : tCommon('save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/expenses')}
            >
              {tCommon('cancel')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
