'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Account, AccountType } from '@/lib/types/accounting';

interface AccountWithId extends Account {
  id?: string;
}

interface ChartOfAccountsTreeProps {
  accounts: AccountWithId[];
  onAddSubAccount?: (parentAccount: AccountWithId) => void;
  isAdmin?: boolean;
}

function getTypeColor(type: AccountType): string {
  switch (type) {
    case 'asset':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'liability':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'equity':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'revenue':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'expense':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
}

function AccountNode({
  account,
  childAccounts,
  onAddSubAccount,
  isAdmin,
  locale,
  t,
}: {
  account: AccountWithId;
  childAccounts: AccountWithId[];
  onAddSubAccount?: (parentAccount: AccountWithId) => void;
  isAdmin?: boolean;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expanded, setExpanded] = useState(account.level === 1);
  const hasChildren = childAccounts.length > 0;
  const isRtl = locale === 'ar';
  const ExpandIcon = !hasChildren ? null : expanded ? ChevronDown : isRtl ? ChevronLeft : ChevronRight;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50',
          account.level === 1 && 'font-semibold'
        )}
        style={{ paddingInlineStart: `${(account.level - 1) * 24 + 8}px` }}
      >
        {ExpandIcon ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted"
          >
            <ExpandIcon className="h-4 w-4" />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}

        <span className="shrink-0 font-mono text-sm text-muted-foreground" dir="ltr">
          {account.code}
        </span>

        <span className="flex-1 text-sm">
          {locale === 'ar' ? account.nameAr : account.nameEn}
        </span>

        <Badge variant="secondary" className={cn('text-xs', getTypeColor(account.type))}>
          {t(`accountTypes.${account.type}`)}
        </Badge>

        {account.isSystem ? (
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Badge variant="outline" className="text-xs">
            {t('customAccount')}
          </Badge>
        )}

        {isAdmin && account.level < 4 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onAddSubAccount?.(account)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {childAccounts.map((child) => (
            <AccountNode
              key={child.code}
              account={child}
              childAccounts={[]}
              onAddSubAccount={onAddSubAccount}
              isAdmin={isAdmin}
              locale={locale}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ChartOfAccountsTree({
  accounts,
  onAddSubAccount,
  isAdmin,
}: ChartOfAccountsTreeProps) {
  const t = useTranslations('journal');
  const locale = useLocale();

  // Group accounts by parent
  const level1 = accounts.filter((a) => a.level === 1);

  const getChildren = (parentCode: string) =>
    accounts.filter((a) => a.parentCode === parentCode).sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="space-y-1">
      {level1.map((parent) => (
        <AccountNode
          key={parent.code}
          account={parent}
          childAccounts={getChildren(parent.code)}
          onAddSubAccount={onAddSubAccount}
          isAdmin={isAdmin}
          locale={locale}
          t={t}
        />
      ))}
    </div>
  );
}
