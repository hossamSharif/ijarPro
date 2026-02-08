'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';

interface ZatcaQrProps {
  data: string; // Base64 TLV string
  size?: number;
  className?: string;
}

export function ZatcaQr({ data, size = 200, className }: ZatcaQrProps) {
  const t = useTranslations('invoices');

  return (
    <div className={className}>
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        {t('zatcaQr')}
      </p>
      <div className="inline-block rounded-lg border bg-white p-3">
        <QRCodeSVG
          value={data}
          size={size}
          level="M"
          marginSize={1}
        />
      </div>
    </div>
  );
}
