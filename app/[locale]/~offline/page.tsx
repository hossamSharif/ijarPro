'use client';

import { useTranslations } from 'next-intl';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const t = useTranslations('offlinePage');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="lg"
        >
          {t('retry')}
        </Button>
      </div>
    </div>
  );
}
