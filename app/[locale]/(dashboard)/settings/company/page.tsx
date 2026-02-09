'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { onSnapshot } from 'firebase/firestore';
import { Save, Upload, X, Plus, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { companySchema, type CompanyFormData } from '@/lib/validators/company';
import { companyRef } from '@/lib/firebase/firestore';
import { updateCompanyProfile } from '@/lib/firebase/company';
import { uploadCompanyLogo } from '@/lib/firebase/storage';
import { useAuth } from '@/lib/hooks/use-auth';

const DEFAULT_EXPENSE_CATEGORIES = [
  'صيانة',
  'كهرباء',
  'مياه',
  'نظافة',
  'أمن',
  'تأمين',
  'أخرى',
];

export default function CompanyProfilePage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const tt = useTranslations('toasts');
  const { firebaseUser, userProfile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      nameAr: '',
      nameEn: '',
      logoUrl: undefined,
      crNumber: '',
      vatNumber: '',
      address: {
        streetAr: '',
        streetEn: '',
        cityAr: '',
        cityEn: '',
        districtAr: '',
        districtEn: '',
        postalCode: '',
        additionalNumber: '',
      },
      phone: '',
      email: undefined,
      website: undefined,
      vatRate: 15,
      sessionTimeout: 30,
      expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    },
  });

  // Load existing company profile
  useEffect(() => {
    const unsubscribe = onSnapshot(companyRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        form.reset({
          nameAr: data.nameAr || '',
          nameEn: data.nameEn || '',
          logoUrl: data.logoUrl || undefined,
          crNumber: data.crNumber || '',
          vatNumber: data.vatNumber || '',
          address: {
            streetAr: data.address?.streetAr || '',
            streetEn: data.address?.streetEn || '',
            cityAr: data.address?.cityAr || '',
            cityEn: data.address?.cityEn || '',
            districtAr: data.address?.districtAr || '',
            districtEn: data.address?.districtEn || '',
            postalCode: data.address?.postalCode || '',
            additionalNumber: data.address?.additionalNumber || '',
          },
          phone: data.phone || '',
          email: data.email || undefined,
          website: data.website || undefined,
          vatRate: data.vatRate ?? 15,
          sessionTimeout: data.sessionTimeout ?? 30,
          expenseCategories: data.expenseCategories?.length
            ? data.expenseCategories
            : DEFAULT_EXPENSE_CATEGORIES,
        });
        if (data.logoUrl) {
          setLogoPreview(data.logoUrl);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [form]);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('logoHint'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t('logoHint'));
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [t]);

  const removeLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
    form.setValue('logoUrl', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [form]);

  const onSubmit = async (data: CompanyFormData) => {
    if (!firebaseUser || !userProfile) return;

    try {
      let logoUrl = data.logoUrl;

      // Upload logo if a new file was selected
      if (logoFile) {
        setUploadingLogo(true);
        logoUrl = await uploadCompanyLogo(logoFile);
        setUploadingLogo(false);
        setLogoFile(null);
      }

      await updateCompanyProfile({
        data: { ...data, logoUrl },
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });

      toast.success(t('saved'));
    } catch {
      toast.error(tt('error'));
      setUploadingLogo(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const categories = form.watch('expenseCategories') || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('companyProfile')}</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('companyProfile')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nameAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('companyNameAr')}</FormLabel>
                      <FormControl>
                        <Input dir="rtl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nameEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('companyNameEn')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <FormLabel>{t('logo')}</FormLabel>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative h-20 w-20 rounded-lg border overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoPreview}
                        alt={t('logoAlt')}
                        className="h-full w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute top-0 end-0 rounded-full bg-destructive p-1 text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      <Upload className="me-2 h-4 w-4" />
                      {logoPreview ? t('changeLogo') : t('uploadLogo')}
                    </Button>
                    <p className="text-xs text-muted-foreground">{t('logoHint')}</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </div>
                </div>
              </div>

              {/* CR & VAT Numbers */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="crNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('crNumber')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vatNumber')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" maxLength={15} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('address')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="address.streetAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('streetAr')}</FormLabel>
                      <FormControl>
                        <Input dir="rtl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.streetEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('streetEn')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="address.districtAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('districtAr')}</FormLabel>
                      <FormControl>
                        <Input dir="rtl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.districtEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('districtEn')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="address.cityAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('cityAr')}</FormLabel>
                      <FormControl>
                        <Input dir="rtl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.cityEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('cityEn')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="address.postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('postalCode')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.additionalNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('additionalNumber')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('phone')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('phone')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" placeholder="+966XXXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" type="email" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('website')}</FormLabel>
                    <FormControl>
                      <Input dir="ltr" placeholder="https://" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="vatRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vatRate')} (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sessionTimeout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('sessionTimeout')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={5}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Expense Categories */}
              <div className="space-y-3">
                <FormLabel>{t('expenseCategories')}</FormLabel>
                <div className="space-y-2">
                  {categories.map((category: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={category}
                        onChange={(e) => {
                          const updated = [...categories];
                          updated[index] = e.target.value;
                          form.setValue('expenseCategories', updated, { shouldValidate: true });
                        }}
                        placeholder={t('categoryPlaceholder')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = categories.filter((_: string, i: number) => i !== index);
                          form.setValue('expenseCategories', updated, { shouldValidate: true });
                        }}
                        disabled={categories.length <= 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.setValue('expenseCategories', [...categories, ''], { shouldValidate: true });
                  }}
                >
                  <Plus className="me-2 h-4 w-4" />
                  {t('addCategory')}
                </Button>
                {form.formState.errors.expenseCategories && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.expenseCategories.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button type="submit" disabled={form.formState.isSubmitting || uploadingLogo}>
              <Save className="me-2 h-4 w-4" />
              {form.formState.isSubmitting || uploadingLogo ? tc('loading') : tc('save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
