'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { PermissionGuard } from '@/lib/permissions/guard';
import { useDocument, useCollection, type WithId } from '@/lib/hooks/use-firestore';
import { useAuth } from '@/lib/hooks/use-auth';
import { buildingDoc } from '@/lib/firebase/firestore';
import { updateBuilding, deactivateBuilding, reactivateBuilding } from '@/lib/firebase/buildings';
import { getApartmentsByBuildingQuery } from '@/lib/firebase/apartments';
import { buildingSchema, type BuildingFormData } from '@/lib/validators/building';
import { formatCurrency } from '@/lib/utils/currency';
import { formatNumber } from '@/lib/utils/numbers';
import type { Building, Apartment } from '@/lib/types/models';
import { ArrowRight, Plus, Pencil, Building as BuildingIcon } from 'lucide-react';

export default function BuildingDetailPage() {
  const t = useTranslations('buildings');
  const ta = useTranslations('apartments');
  const tc = useTranslations('common');
  const tt = useTranslations('toasts');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const buildingId = params.id as string;
  const { firebaseUser, userProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  const buildingRef = useMemo(() => buildingDoc(buildingId), [buildingId]);
  const { data: building, loading: buildingLoading } = useDocument<Building>(buildingRef);

  const apartmentsQuery = useMemo(
    () => getApartmentsByBuildingQuery(buildingId),
    [buildingId]
  );
  const { data: apartments, loading: apartmentsLoading } = useCollection<Apartment>(apartmentsQuery);

  const form = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    values: building
      ? {
          nameAr: building.nameAr,
          nameEn: building.nameEn,
          address: building.address,
          floors: building.floors,
          description: building.description || '',
        }
      : undefined,
  });

  const onSubmit = async (data: BuildingFormData) => {
    if (!firebaseUser || !userProfile) return;
    try {
      await updateBuilding({
        buildingId,
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

  const handleDeactivate = async () => {
    if (!firebaseUser || !userProfile || !building) return;
    if (building.occupiedCount > 0) {
      toast.error(t('cannotDeactivate'));
      setShowDeactivateDialog(false);
      return;
    }
    try {
      await deactivateBuilding({
        buildingId,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });
      toast.success(tt('updated'));
      setShowDeactivateDialog(false);
    } catch {
      toast.error(tt('error'));
    }
  };

  const handleReactivate = async () => {
    if (!firebaseUser || !userProfile) return;
    try {
      await reactivateBuilding({
        buildingId,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });
      toast.success(tt('updated'));
    } catch {
      toast.error(tt('error'));
    }
  };

  const apartmentColumns: DataTableColumn<WithId<Apartment>>[] = useMemo(
    () => [
      {
        key: 'unitNumber',
        header: ta('unitNumber'),
        cell: (row) => row.unitNumber,
        sortable: true,
      },
      {
        key: 'floor',
        header: ta('floor'),
        cell: (row) => row.floor,
        sortable: true,
      },
      {
        key: 'rooms',
        header: ta('rooms'),
        cell: (row) => row.rooms,
      },
      {
        key: 'areaSqm',
        header: ta('areaSqm'),
        cell: (row) => row.areaSqm,
      },
      {
        key: 'monthlyRent',
        header: ta('monthlyRent'),
        cell: (row) => formatCurrency(row.monthlyRent, locale),
      },
      {
        key: 'status',
        header: tc('status'),
        cell: (row) => {
          const variant = row.status === 'vacant' ? 'default' : row.status === 'occupied' ? 'secondary' : 'outline';
          const label = row.status === 'vacant' ? ta('vacant') : row.status === 'occupied' ? ta('occupied') : ta('underMaintenance');
          return <Badge variant={variant}>{label}</Badge>;
        },
      },
    ],
    [ta, tc]
  );

  if (buildingLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{tc('noResults')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/buildings')}>
          <ArrowRight className="h-4 w-4 me-1 rtl:rotate-180" />
          {tc('back')}
        </Button>
      </div>

      {/* Building Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BuildingIcon className="h-6 w-6" />
              <CardTitle>{t('buildingDetails')}</CardTitle>
              <Badge variant={building.status === 'active' ? 'default' : 'secondary'}>
                {building.status === 'active' ? t('active') : t('inactive')}
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
                {building.status === 'active' ? (
                  <Button variant="destructive" size="sm" onClick={() => setShowDeactivateDialog(true)}>
                    {t('deactivate')}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleReactivate}>
                    {t('activate')}
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
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    {tc('cancel')}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('nameAr')}</p>
                <p className="font-medium">{building.nameAr}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('nameEn')}</p>
                <p className="font-medium">{building.nameEn}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('address')}</p>
                <p className="font-medium">{building.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('floors')}</p>
                <p className="font-medium">{building.floors}</p>
              </div>
              {building.description && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">{t('description')}</p>
                  <p className="font-medium">{building.description}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Occupancy Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatNumber(building.apartmentCount, locale)}</div>
            <p className="text-sm text-muted-foreground">{t('apartmentCount')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{formatNumber(building.occupiedCount, locale)}</div>
            <p className="text-sm text-muted-foreground">{t('occupiedCount')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{formatNumber(building.vacantCount, locale)}</div>
            <p className="text-sm text-muted-foreground">{t('vacantCount')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{formatNumber(building.maintenanceCount, locale)}</div>
            <p className="text-sm text-muted-foreground">{t('maintenanceCount')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Apartments List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('apartments')}</CardTitle>
            <PermissionGuard permission="canManageBuildings">
              <Button size="sm" onClick={() => router.push(`/buildings/${buildingId}/apartments/new`)}>
                <Plus className="h-4 w-4 me-2" />
                {ta('addApartment')}
              </Button>
            </PermissionGuard>
          </div>
        </CardHeader>
        <CardContent>
          {apartmentsLoading ? (
            <p className="text-muted-foreground">{tc('loading')}</p>
          ) : apartments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t('noApartments')}</p>
          ) : (
            <DataTable
              columns={apartmentColumns}
              data={apartments}
              searchKey="unitNumber"
              searchPlaceholder={tc('search')}
              onRowClick={(row) => router.push(`/apartments/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deactivate')}</DialogTitle>
            <DialogDescription>{t('confirmDeactivate')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeactivate}>
              {tc('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
