'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from 'lucide-react';
import { formatDualDate } from '@/lib/utils/dates';
import { cn } from '@/lib/utils';

interface HijriDatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function HijriDatePicker({
  value,
  onChange,
  label,
  error,
  disabled,
}: HijriDatePickerProps) {
  const tc = useTranslations('common');
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      onChange(new Date(dateValue));
    }
  };

  return (
    <div className="space-y-1">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-start font-normal',
              !value && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <Calendar className="me-2 h-4 w-4" />
            {value ? formatDualDate(value, locale) : tc('selectDate')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <Input
            type="date"
            value={value ? value.toISOString().split('T')[0] : ''}
            onChange={handleChange}
            className="w-full"
          />
          {value && (
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDualDate(value, locale)}
            </p>
          )}
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
