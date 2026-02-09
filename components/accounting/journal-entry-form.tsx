'use client';

import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { BalanceIndicator } from './balance-indicator';
import type { Account } from '@/lib/types/accounting';
import type { JournalEntryFormData } from '@/lib/validators/journal-entry';

interface JournalEntryFormFieldsProps {
  accounts: Account[];
}

export function JournalEntryFormFields({ accounts }: JournalEntryFormFieldsProps) {
  const t = useTranslations('journal');
  const locale = useLocale();
  const form = useFormContext<JournalEntryFormData>();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const watchedLines = useWatch({ control: form.control, name: 'lines' });

  const totalDebits = (watchedLines ?? []).reduce((sum, line) => sum + (line?.debit ?? 0), 0);
  const totalCredits = (watchedLines ?? []).reduce((sum, line) => sum + (line?.credit ?? 0), 0);

  // Only show level 2+ accounts (actual posting accounts, not category headers)
  const postingAccounts = accounts.filter((a) => a.level >= 2 && a.isActive);

  const addLine = () => {
    append({
      accountId: '',
      accountNameAr: '',
      accountNameEn: '',
      debit: 0,
      credit: 0,
      description: '',
    });
  };

  const handleAccountChange = (index: number, accountCode: string) => {
    const account = accounts.find((a) => a.code === accountCode);
    if (account) {
      form.setValue(`lines.${index}.accountId`, account.code);
      form.setValue(`lines.${index}.accountNameAr`, account.nameAr);
      form.setValue(`lines.${index}.accountNameEn`, account.nameEn);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Indicator */}
      <BalanceIndicator totalDebits={totalDebits} totalCredits={totalCredits} />

      {/* Journal Lines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t('lines')}</h3>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="me-1 h-4 w-4" />
            {t('addLine')}
          </Button>
        </div>

        {/* Header row */}
        <div className="hidden gap-3 sm:grid sm:grid-cols-[1fr_120px_120px_1fr_40px]">
          <span className="text-xs font-medium text-muted-foreground">{t('account')}</span>
          <span className="text-xs font-medium text-muted-foreground">{t('debit')}</span>
          <span className="text-xs font-medium text-muted-foreground">{t('credit')}</span>
          <span className="text-xs font-medium text-muted-foreground">{t('description')}</span>
          <span />
        </div>

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_120px_120px_1fr_40px] sm:border-0 sm:p-0"
          >
            {/* Account Selector */}
            <FormField
              control={form.control}
              name={`lines.${index}.accountId`}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel className="sm:sr-only">{t('account')}</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      formField.onChange(val);
                      handleAccountChange(index, val);
                    }}
                    value={formField.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectAccount')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {postingAccounts.map((acc) => (
                        <SelectItem key={acc.code} value={acc.code}>
                          <span className="font-mono text-xs text-muted-foreground me-2" dir="ltr">
                            {acc.code}
                          </span>
                          {locale === 'ar' ? acc.nameAr : acc.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Debit */}
            <FormField
              control={form.control}
              name={`lines.${index}.debit`}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel className="sm:sr-only">{t('debit')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      dir="ltr"
                      placeholder="0.00"
                      value={formField.value || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        formField.onChange(val);
                        // Clear credit if debit is entered
                        if (val > 0) {
                          form.setValue(`lines.${index}.credit`, 0);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Credit */}
            <FormField
              control={form.control}
              name={`lines.${index}.credit`}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel className="sm:sr-only">{t('credit')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      dir="ltr"
                      placeholder="0.00"
                      value={formField.value || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        formField.onChange(val);
                        // Clear debit if credit is entered
                        if (val > 0) {
                          form.setValue(`lines.${index}.debit`, 0);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name={`lines.${index}.description`}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel className="sm:sr-only">{t('description')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('description')}
                      {...formField}
                      value={formField.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Remove */}
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                onClick={() => remove(index)}
                disabled={fields.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {fields.length < 2 && (
          <p className="text-sm text-destructive">{t('minLinesError')}</p>
        )}
      </div>
    </div>
  );
}
