'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BilingualInputProps {
  labelAr: string;
  labelEn: string;
  valueAr: string;
  valueEn: string;
  onChangeAr: (value: string) => void;
  onChangeEn: (value: string) => void;
  placeholderAr?: string;
  placeholderEn?: string;
  disabled?: boolean;
}

export function BilingualInput({
  labelAr,
  labelEn,
  valueAr,
  valueEn,
  onChangeAr,
  onChangeEn,
  placeholderAr,
  placeholderEn,
  disabled,
}: BilingualInputProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>{labelAr}</Label>
        <Input
          dir="rtl"
          value={valueAr}
          onChange={(e) => onChangeAr(e.target.value)}
          placeholder={placeholderAr}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label>{labelEn}</Label>
        <Input
          dir="ltr"
          value={valueEn}
          onChange={(e) => onChangeEn(e.target.value)}
          placeholder={placeholderEn}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
