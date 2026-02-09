'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { query, where, orderBy } from 'firebase/firestore';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { HijriDatePicker } from '@/components/shared/hijri-date-picker';
import { PermissionGuard } from '@/lib/permissions/guard';
import { useDocument, useCollection, type WithId } from '@/lib/hooks/use-firestore';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  customerDoc,
  apartmentDoc,
  buildingDoc,
  invoicesCollection,
} from '@/lib/firebase/firestore';
import {
  updateCustomer,
  deactivateCustomer,
  reactivateCustomer,
  linkCustomerToApartment,
  unlinkCustomerFromApartment,
} from '@/lib/firebase/customers';
import { getActiveBuildingsQuery } from '@/lib/firebase/buildings';
import { getApartmentsByBuildingQuery } from '@/lib/firebase/apartments';
import { formatDualDate } from '@/lib/utils/dates';
import { formatCurrency } from '@/lib/utils/currency';
import type { Customer, Building, Apartment, Invoice, InvoiceStatus } from '@/lib/types/models';
import { ArrowRight, Pencil, Users, Link2, Unlink, AlertTriangle } from 'lucide-react';

const editSchema = z.object({
  nameAr: z.string().min(2).max(200),
  nameEn: z.string().min(2).max(200),
  phone: z.string().regex(/^\+\d{10,15}$/, 'Must be E.164 format'),
  email: z.string().email().optional().or(z.literal('')),
  nationality: z.string().min(2).max(100),
  idExpiry: z.date(),
  notes: z.string().max(2000).optional(),
});

type EditFormData = z.infer<typeof editSchema>;

const invoiceStatusVariant: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  issued: 'default',
  paid: 'secondary',
  partially_paid: 'secondary',
  overdue: 'destructive',
  cancelled: 'outline',
};

export default function CustomerDetailPage() {
  const t = useTranslations('customers');
  const ti = useTranslations('invoices');
  const tc = useTranslations('common');
  const tt = useTranslations('toasts');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const { firebaseUser, userProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');
  const [leaseStart, setLeaseStart] = useState<Date | undefined>();
  const [leaseEnd, setLeaseEnd] = useState<Date | undefined>();
  const [linkLoading, setLinkLoading] = useState(false);

  // Customer data
  const custRef = useMemo(() => customerDoc(customerId), [customerId]);
  const { data: customer, loading } = useDocument<Customer>(custRef);

  // Linked apartment and building
  const aptRef = useMemo(
    () => (customer?.currentApartmentId ? apartmentDoc(customer.currentApartmentId) : null),
    [customer?.currentApartmentId]
  );
  const { data: linkedApartment } = useDocument<Apartment>(aptRef);

  const bldgRef = useMemo(
    () => (customer?.currentBuildingId ? buildingDoc(customer.currentBuildingId) : null),
    [customer?.currentBuildingId]
  );
  const { data: linkedBuilding } = useDocument<Building>(bldgRef);

  // Invoice history
  const invoicesQuery = useMemo(
    () => query(invoicesCollection, where('customerId', '==', customerId), orderBy('createdAt', 'desc')),
    [customerId]
  );
  const { data: invoices, loading: invoicesLoading } = useCollection<Invoice>(invoicesQuery);

  // Buildings for link dialog
  const buildingsQuery = useMemo(() => getActiveBuildingsQuery(), []);
  const { data: buildings } = useCollection<Building>(buildingsQuery);

  // Apartments for selected building (for linking)
  const apartmentsQuery = useMemo(
    () => selectedBuildingId ? getApartmentsByBuildingQuery(selectedBuildingId) : null,
    [selectedBuildingId]
  );
  const { data: apartments } = useCollection<Apartment>(apartmentsQuery);
  const vacantApartments = useMemo(
    () => apartments.filter((a) => a.status === 'vacant'),
    [apartments]
  );

  // Edit form
  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    values: customer
      ? {
          nameAr: customer.nameAr,
          nameEn: customer.nameEn,
          phone: customer.phone,
          email: customer.email || '',
          nationality: customer.nationality,
          idExpiry: customer.idExpiry.toDate(),
          notes: customer.notes || '',
        }
      : undefined,
  });

  const onSubmit = async (data: EditFormData) => {
    if (!firebaseUser || !userProfile) return;
    try {
      await updateCustomer({
        customerId,
        data: {
          ...data,
          email: data.email || undefined,
        },
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
    if (!firebaseUser || !userProfile) return;
    try {
      await deactivateCustomer({
        customerId,
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
      await reactivateCustomer({
        customerId,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });
      toast.success(tt('updated'));
    } catch {
      toast.error(tt('error'));
    }
  };

  const handleLink = async () => {
    if (!firebaseUser || !userProfile || !selectedApartmentId || !selectedBuildingId || !leaseStart || !leaseEnd) return;
    setLinkLoading(true);
    try {
      await linkCustomerToApartment({
        customerId,
        apartmentId: selectedApartmentId,
        buildingId: selectedBuildingId,
        leaseStart,
        leaseEnd,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });
      toast.success(tt('updated'));
      setShowLinkDialog(false);
      setSelectedBuildingId('');
      setSelectedApartmentId('');
      setLeaseStart(undefined);
      setLeaseEnd(undefined);
    } catch {
      toast.error(tt('error'));
    } finally {
      setLinkLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!firebaseUser || !userProfile || !customer?.currentApartmentId || !customer?.currentBuildingId) return;
    try {
      await unlinkCustomerFromApartment({
        customerId,
        apartmentId: customer.currentApartmentId,
        buildingId: customer.currentBuildingId,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });
      toast.success(tt('updated'));
      setShowUnlinkDialog(false);
    } catch {
      toast.error(tt('error'));
    }
  };

  const isIdExpired = customer && customer.idExpiry.toDate() < new Date();

  // Invoice history columns
  const invoiceColumns: DataTableColumn<WithId<Invoice>>[] = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        header: ti('invoiceNumber'),
        cell: (row) => <span className="font-mono">{row.invoiceNumber}</span>,
        sortable: true,
      },
      {
        key: 'invoiceDate',
        header: ti('invoiceDate'),
        cell: (row) => formatDualDate(row.invoiceDate.toDate(), locale),
      },
      {
        key: 'total',
        header: ti('total'),
        cell: (row) => formatCurrency(row.total, locale),
        sortable: true,
      },
      {
        key: 'status',
        header: tc('status'),
        cell: (row) => (
          <Badge variant={invoiceStatusVariant[row.status]}>
            {ti(`status.${row.status}`)}
          </Badge>
        ),
      },
    ],
    [ti, tc]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{tc('noResults')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/customers')}>
          <ArrowRight className="h-4 w-4 me-1 rtl:rotate-180" />
          {tc('back')}
        </Button>
      </div>

      {/* Customer Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              <CardTitle>{t('customerDetails')}</CardTitle>
              <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                {customer.isActive ? tc('active') : tc('inactive')}
              </Badge>
              {isIdExpired && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 me-1" />
                  {t('idExpired')}
                </Badge>
              )}
            </div>
            <PermissionGuard permission="canManageCustomers">
              <div className="flex gap-2">
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 me-1" />
                    {tc('edit')}
                  </Button>
                )}
                {customer.isActive ? (
                  <Button variant="destructive" size="sm" onClick={() => setShowDeactivateDialog(true)}>
                    {tc('deactivate')}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleReactivate}>
                    {tc('activate')}
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('phone')}</FormLabel>
                        <FormControl>
                          <Input dir="ltr" {...field} />
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
                          <Input dir="ltr" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                <p className="font-medium">{customer.nameAr}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('nameEn')}</p>
                <p className="font-medium">{customer.nameEn}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('nationalId')}</p>
                <p className="font-medium font-mono">{customer.nationalId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('phone')}</p>
                <p className="font-medium" dir="ltr">{customer.phone}</p>
              </div>
              {customer.email && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('email')}</p>
                  <p className="font-medium" dir="ltr">{customer.email}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">{t('nationality')}</p>
                <p className="font-medium">{customer.nationality}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('idExpiry')}</p>
                <p className="font-medium">
                  {formatDualDate(customer.idExpiry.toDate(), locale)}
                </p>
              </div>
              {customer.notes && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">{t('notes')}</p>
                  <p className="font-medium">{customer.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Apartment Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('linkedApartment')}</CardTitle>
            <PermissionGuard permission="canManageCustomers">
              {customer.currentApartmentId ? (
                <Button variant="outline" size="sm" onClick={() => setShowUnlinkDialog(true)}>
                  <Unlink className="h-4 w-4 me-1" />
                  {t('unlinkApartment')}
                </Button>
              ) : (
                <Button size="sm" onClick={() => setShowLinkDialog(true)}>
                  <Link2 className="h-4 w-4 me-1" />
                  {t('linkApartment')}
                </Button>
              )}
            </PermissionGuard>
          </div>
        </CardHeader>
        <CardContent>
          {customer.currentApartmentId && linkedApartment ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('linkedApartment')}</p>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => router.push(`/apartments/${customer.currentApartmentId}`)}
                >
                  {linkedBuilding?.nameAr} — {linkedApartment.unitNumber}
                </Button>
              </div>
              {linkedApartment.leaseStart && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('leaseStart')}</p>
                  <p className="font-medium">
                    {formatDualDate(linkedApartment.leaseStart.toDate(), locale)}
                  </p>
                </div>
              )}
              {linkedApartment.leaseEnd && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('leaseEnd')}</p>
                  <p className="font-medium">
                    {formatDualDate(linkedApartment.leaseEnd.toDate(), locale)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">{tc('status')}</p>
                <Badge variant="secondary">{formatCurrency(linkedApartment.monthlyRent, locale)}</Badge>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">{t('noLinkedApartment')}</p>
          )}
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('invoiceHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <p className="text-muted-foreground">{tc('loading')}</p>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t('noInvoices')}</p>
          ) : (
            <DataTable
              columns={invoiceColumns}
              data={invoices}
              searchKey="invoiceNumber"
              searchPlaceholder={tc('search')}
              onRowClick={(row) => router.push(`/invoices/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>

      {/* Deactivate Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tc('deactivate')}</DialogTitle>
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

      {/* Unlink Dialog */}
      <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('unlinkApartment')}</DialogTitle>
            <DialogDescription>{t('confirmUnlink')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlinkDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleUnlink}>
              {tc('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('linkApartment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('selectBuilding')}</label>
              <Select value={selectedBuildingId} onValueChange={(val) => {
                setSelectedBuildingId(val);
                setSelectedApartmentId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectBuilding')} />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nameAr} ({b.vacantCount} {t('vacant')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBuildingId && (
              <div>
                <label className="text-sm font-medium">{t('selectApartment')}</label>
                <Select value={selectedApartmentId} onValueChange={setSelectedApartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectApartment')} />
                  </SelectTrigger>
                  <SelectContent>
                    {vacantApartments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.unitNumber} — {formatCurrency(a.monthlyRent, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <HijriDatePicker
              value={leaseStart}
              onChange={setLeaseStart}
              label={t('leaseStart')}
            />

            <HijriDatePicker
              value={leaseEnd}
              onChange={setLeaseEnd}
              label={t('leaseEnd')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleLink}
              disabled={!selectedApartmentId || !leaseStart || !leaseEnd || linkLoading}
            >
              {linkLoading ? tc('loading') : tc('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
