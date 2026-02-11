'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { onSnapshot, getDocs, query, where, orderBy, collection } from 'firebase/firestore';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
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

import { JournalEntryFormFields } from '@/components/accounting/journal-entry-form';
import { journalEntrySchema, type JournalEntryFormData } from '@/lib/validators/journal-entry';
import { createManualJournalEntry } from '@/lib/firebase/journal';
import { accountsCollection, buildingConverter } from '@/lib/firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { Building } from '@/lib/types/models';
import type { Account } from '@/lib/types/accounting';

type BuildingWithId = Building & { id: string };

export default function NewJournalEntryPage() {
  const t = useTranslations('journal');
  const tCommon = useTranslations('common');
  const tToasts = useTranslations('toasts');
  const locale = useLocale();
  const router = useRouter();
  const { firebaseUser, userProfile } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [buildings, setBuildings] = useState<BuildingWithId[]>([]);

  const form = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      date: new Date(),
      description: '',
      buildingId: undefined,
      lines: [
        { accountId: '', accountNameAr: '', accountNameEn: '', debit: 0, credit: 0, description: '' },
        { accountId: '', accountNameAr: '', accountNameEn: '', debit: 0, credit: 0, description: '' },
      ],
    },
  });

  // Load accounts
  useEffect(() => {
    const unsub = onSnapshot(accountsCollection, (snap) => {
      const accs = snap.docs.map((d) => d.data());
      accs.sort((a, b) => a.code.localeCompare(b.code));
      setAccounts(accs);
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

  const onSubmit = async (data: JournalEntryFormData) => {
    if (!firebaseUser || !userProfile) return;

    try {
      await createManualJournalEntry({
        data,
        userId: firebaseUser.uid,
        userName: userProfile.nameAr,
      });

      toast.success(t('entryCreated'));
      router.push('/journal');
    } catch (err) {
      if (err instanceof Error && err.message.includes('debits must equal')) {
        toast.error(t('balanceError'));
      } else {
        console.error('[JournalCreate] Error:', err);
        toast.error(err instanceof Error ? err.message : tToasts('error'));
      }
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">{t('createEntry')}</h1>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Entry Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('description')}</CardTitle>
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

                {/* Building (optional) */}
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('building')}</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === '__none__' ? undefined : val)}
                        value={field.value ?? '__none__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('allBuildings')} />
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
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Journal Lines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('lines')}</CardTitle>
            </CardHeader>
            <CardContent>
              <JournalEntryFormFields accounts={accounts} />
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
              onClick={() => router.push('/journal')}
            >
              {tCommon('cancel')}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
