'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
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
import { buildingSchema, type BuildingFormData } from '@/lib/validators/building';
import { createBuilding } from '@/lib/firebase/buildings';
import { useAuth } from '@/lib/hooks/use-auth';
import { ArrowRight } from 'lucide-react';

export default function NewBuildingPage() {
  const t = useTranslations('buildings');
  const tc = useTranslations('common');
  const tt = useTranslations('toasts');
  const router = useRouter();
  const { firebaseUser, userProfile } = useAuth();

  const form = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      nameAr: '',
      nameEn: '',
      address: '',
      floors: 1,
      description: '',
    },
  });

  const onSubmit = async (data: BuildingFormData) => {
    if (!firebaseUser || !userProfile) return;

    try {
      const id = await createBuilding({
        data,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });
      toast.success(tt('created'));
      router.push(`/buildings/${id}`);
    } catch {
      toast.error(tt('error'));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/buildings')}>
          <ArrowRight className="h-4 w-4 me-1 rtl:rotate-180" />
          {tc('back')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('addBuilding')}</CardTitle>
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

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('address')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('floors')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={200}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                <Button type="button" variant="outline" onClick={() => router.push('/buildings')}>
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
