'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { apartmentSchema, type ApartmentFormData } from '@/lib/validators/apartment';
import { createApartment, checkUnitNumberExists } from '@/lib/firebase/apartments';
import { useAuth } from '@/lib/hooks/use-auth';
import { useDocument } from '@/lib/hooks/use-firestore';
import { buildingDoc } from '@/lib/firebase/firestore';
import type { Building } from '@/lib/types/models';
import { ArrowRight } from 'lucide-react';

export default function NewApartmentPage() {
  const t = useTranslations('apartments');
  const tb = useTranslations('buildings');
  const tc = useTranslations('common');
  const tt = useTranslations('toasts');
  const te = useTranslations('errors');
  const router = useRouter();
  const params = useParams();
  const buildingId = params.id as string;
  const { firebaseUser, userProfile } = useAuth();

  const buildingRef = useMemo(() => buildingDoc(buildingId), [buildingId]);
  const { data: building } = useDocument<Building>(buildingRef);

  const form = useForm<ApartmentFormData>({
    resolver: zodResolver(apartmentSchema),
    defaultValues: {
      buildingId,
      unitNumber: '',
      floor: 0,
      rooms: 1,
      areaSqm: 1,
      monthlyRent: 0,
      description: '',
    },
  });

  const onSubmit = async (data: ApartmentFormData) => {
    if (!firebaseUser || !userProfile) return;

    // Check unit number uniqueness
    const exists = await checkUnitNumberExists(buildingId, data.unitNumber);
    if (exists) {
      form.setError('unitNumber', { message: te('required') });
      return;
    }

    try {
      await createApartment({
        data: { ...data, buildingId },
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });
      toast.success(tt('created'));
      router.push(`/buildings/${buildingId}`);
    } catch {
      toast.error(tt('error'));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/buildings/${buildingId}`)}>
          <ArrowRight className="h-4 w-4 me-1 rtl:rotate-180" />
          {tc('back')}
        </Button>
        {building && (
          <span className="text-muted-foreground text-sm">
            {building.nameAr} / {building.nameEn}
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('addApartment')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="unitNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('unitNumber')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="floor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('floor')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={building?.floors || 200}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('rooms')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="areaSqm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('areaSqm')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step="0.1"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthlyRent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('monthlyRent')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('description')}</FormLabel>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/buildings/${buildingId}`)}
                >
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
