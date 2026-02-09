'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SessionTimeoutDialogProps {
  open: boolean;
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
}

export function SessionTimeoutDialog({
  open,
  secondsLeft,
  onStay,
  onLogout,
}: SessionTimeoutDialogProps) {
  const t = useTranslations('auth');

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('sessionWarningTitle')}</DialogTitle>
          <DialogDescription>
            {t('sessionWarningDescription', { seconds: secondsLeft })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onLogout}>
            {t('logout')}
          </Button>
          <Button onClick={onStay}>
            {t('stayLoggedIn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
