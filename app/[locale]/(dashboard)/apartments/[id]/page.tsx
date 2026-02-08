'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PermissionGuard } from '@/lib/permissions/guard';
import { useDocument } from '@/lib/hooks/use-firestore';
import { useAuth } from '@/lib/hooks/use-auth';
import { apartmentDoc, buildingDoc } from '@/lib/firebase/firestore';
import { updateApartment, changeApartmentStatus } from '@/lib/firebase/apartments';
import type { Apartment, Building, ApartmentStatus } from '@/lib/types/models';
import { ArrowRight, Pencil, Home } from 'lucide-react';

const editSchema = z.object({
  unitNumber: z.string().min(1).max(20),
  floor: z.number().int().min(0),
  rooms: z.number().int().min(1),
  areaSqm: z.number().min(1),
  monthlyRent: z.number().min(0),
  description: z.string().max(1000).optional(),
});

type EditFormData = z.infer<typeof editSchema>;

function getStatusBadgeVariant(status: ApartmentStatus) {
  switch (status) {
    case 'vacant':
      return 'default' as const;
    case 'occupied':
      return 'secondary' as const;
    case 'under_maintenance':
      return 'outline' as const;
  }
}

export default function ApartmentDetailPage() {
  const t = useTranslations('apartments');
  const tc = useTranslations('common');
  const tt = useTranslations('toasts');
  const router = useRouter();
  const params = useParams();
  const apartmentId = params.id as string;
  const { firebaseUser, userProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);

  const aptRef = useMemo(() => apartmentDoc(apartmentId), [apartmentId]);
  const { data: apartment, loading } = useDocument<Apartment>(aptRef);

  const bldgRef = useMemo(
    () => (apartment ? buildingDoc(apartment.buildingId) : null),
    [apartment]
  );
  const { data: building } = useDocument<Building>(bldgRef);

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    values: apartment
      ? {
          unitNumber: apartment.unitNumber,
          floor: apartment.floor,
          rooms: apartment.rooms,
          areaSqm: apartment.areaSqm,
          monthlyRent: apartment.monthlyRent,
          description: apartment.description || '',
        }
      : undefined,
  });

  const onSubmit = async (data: EditFormData) => {
    if (!firebaseUser || !userProfile) return;
    try {
      await updateApartment({
        apartmentId,
        data,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });
      toast.success(tt('updated'));
      setIsEditing(false);
    } catch {
      toast.error(tt('error'));
    }
  };

  const handleStatusChange = async (newStatus: ApartmentStatus) => {
    if (!firebaseUser || !userProfile || !apartment) return;
    try {
      await changeApartmentStatus({
        apartmentId,
        buildingId: apartment.buildingId,
        oldStatus: apartment.status,
        newStatus,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });
      toast.success(tt('updated'));
    } catch {
      toast.error(tt('error'));
    }
  };

  const statusLabel = (status: ApartmentStatus) => {
    switch (status) {
      case 'vacant': return t('vacant');
      case 'occupied': return t('occupied');
      case 'under_maintenance': return t('underMaintenance');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{tc('noResults')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/buildings/${apartment.buildingId}`)}
        >
          <ArrowRight className="h-4 w-4 me-1 rtl:rotate-180" />
          {tc('back')}
        </Button>
        {building && (
          <span className="text-muted-foreground text-sm">
            {building.nameAr}
          </span>
        )}
      </div>

      {/* Apartment Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Home className="h-6 w-6" />
              <CardTitle>{t('apartmentDetails')}</CardTitle>
              <Badge variant={getStatusBadgeVariant(apartment.status)}>
                {statusLabel(apartment.status)}
              </Badge>
            </div>
            <PermissionGuard permission="canManageBuildings">
              <div className="flex gap-2">
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 me-1" />
                    {tc('edit')}
                  </Button>
                )}
              </div>
            </PermissionGuard>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    {tc('cancel')}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('unitNumber')}</p>
                <p className="font-medium">{apartment.unitNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('building')}</p>
                <p className="font-medium">{building?.nameAr || apartment.buildingId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('floor')}</p>
                <p className="font-medium">{apartment.floor}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('rooms')}</p>
                <p className="font-medium">{apartment.rooms}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('areaSqm')}</p>
                <p className="font-medium">{apartment.areaSqm}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('monthlyRent')}</p>
                <p className="font-medium">{apartment.monthlyRent.toLocaleString()} {tc('currency')}</p>
              </div>
              {apartment.description && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">{t('description')}</p>
                  <p className="font-medium">{apartment.description}</p>
                </div>
              )}
              {apartment.currentCustomerId && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">{t('currentTenant')}</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => router.push(`/customers/${apartment.currentCustomerId}`)}
                  >
                    {apartment.currentCustomerId}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Management */}
      <PermissionGuard permission="canManageBuildings">
        <Card>
          <CardHeader>
            <CardTitle>{t('changeStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {apartment.status !== 'vacant' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('vacant')}
                >
                  {t('setVacant')}
                </Button>
              )}
              {apartment.status !== 'under_maintenance' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('under_maintenance')}
                >
                  {t('setMaintenance')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  );
}
