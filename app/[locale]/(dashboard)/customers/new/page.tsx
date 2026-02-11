'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
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
import { HijriDatePicker } from '@/components/shared/hijri-date-picker';
import { customerSchema, type CustomerFormData } from '@/lib/validators/customer';
import { createCustomer } from '@/lib/firebase/customers';
import { useAuth } from '@/lib/hooks/use-auth';
import { ArrowRight } from 'lucide-react';

export default function NewCustomerPage() {
  const t = useTranslations('customers');
  const tc = useTranslations('common');
  const tt = useTranslations('toasts');
  const router = useRouter();
  const { firebaseUser, userProfile } = useAuth();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      nameAr: '',
      nameEn: '',
      nationalId: '',
      phone: '+966',
      email: '',
      nationality: '',
      notes: '',
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    if (!firebaseUser || !userProfile) return;

    try {
      const id = await createCustomer({
        data,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });
      toast.success(tt('created'));
      router.push(`/customers/${id}`);
    } catch (err) {
      if (err instanceof Error && err.message === 'NATIONAL_ID_EXISTS') {
        toast.error(t('nationalIdExists'));
      } else {
        toast.error(tt('error'));
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/customers')}>
          <ArrowRight className="h-4 w-4 me-1 rtl:rotate-180" />
          {tc('back')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('addCustomer')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nameAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('nameAr')}</FormLabel>
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
                      <FormLabel>{t('nameEn')}</FormLabel>
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
                  name="nationalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('nationalId')}</FormLabel>
                      <FormControl>
                        <Input
                          dir="ltr"
                          maxLength={10}
                          placeholder="1234567890"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('phone')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" placeholder="+966512345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input dir="ltr" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('nationality')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="idExpiry"
                render={({ field, fieldState }) => (
                  <HijriDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    label={t('idExpiry')}
                    error={fieldState.error?.message}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('notes')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? tc('loading') : tc('save')}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push('/customers')}>
                  {tc('cancel')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
