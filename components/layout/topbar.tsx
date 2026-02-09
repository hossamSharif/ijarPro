'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { signOut } from '@/lib/firebase/auth';
import { useAuth } from '@/lib/hooks/use-auth';
import { SyncIndicator } from '@/components/layout/sync-indicator';

const LOCALE_STORAGE_KEY = 'ijar-pro-locale';

export function Topbar() {
  const t = useTranslations();
  const tLang = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { userProfile } = useAuth();

  const toggleLocale = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    // Persist preference
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // localStorage may not be available
    }
    const pathWithoutLocale = pathname.replace(/^\/(ar|en)/, '') || '/';
    const newPath = newLocale === 'ar' ? pathWithoutLocale : `/en${pathWithoutLocale}`;
    router.push(newPath);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const displayName = locale === 'ar' ? userProfile?.nameAr : userProfile?.nameEn;

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />

      <div className="flex-1" />

      <SyncIndicator />

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleLocale}
        title={tLang('toggle')}
        aria-label={tLang('toggle')}
      >
        <Globe className="h-4 w-4" />
        <span className="sr-only">{locale === 'ar' ? tLang('switchToEnglish') : tLang('switchToArabic')}</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push('/profile')}>
            <User className="me-2 h-4 w-4" />
            {t('nav.profile')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="me-2 h-4 w-4" />
            {t('auth.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
