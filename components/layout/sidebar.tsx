'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  DoorOpen,
  Users,
  FileText,
  Wallet,
  BookOpen,
  BarChart3,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useAuth } from '@/lib/hooks/use-auth';
import { usePermission } from '@/lib/permissions/guard';

export function Sidebar() {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const canManageBuildings = usePermission('canManageBuildings');
  const canManageCustomers = usePermission('canManageCustomers');
  const canViewJournal = usePermission('canViewJournal');
  const canViewReports = usePermission('canViewReports');

  const mainNav = [
    { href: '/', label: t('dashboard'), icon: LayoutDashboard, show: true },
    { href: '/buildings', label: t('buildings'), icon: Building2, show: canManageBuildings || isAdmin },
    { href: '/customers', label: t('customers'), icon: Users, show: canManageCustomers || isAdmin },
    { href: '/invoices', label: t('invoices'), icon: FileText, show: true },
    { href: '/expenses', label: t('expenses'), icon: Wallet, show: true },
    { href: '/journal', label: t('journal'), icon: BookOpen, show: canViewJournal || isAdmin },
    { href: '/reports', label: t('reports'), icon: BarChart3, show: canViewReports || isAdmin },
  ];

  const settingsNav = [
    { href: '/settings/company', label: t('companyProfile'), show: isAdmin },
    { href: '/settings/users', label: t('userManagement'), show: isAdmin },
  ];

  return (
    <SidebarUI>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <DoorOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">{tCommon('appName')}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav
                .filter((item) => item.show)
                .map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {settingsNav.some((item) => item.show) && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <Settings className="me-2 h-4 w-4" />
              {t('settings')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsNav
                  .filter((item) => item.show)
                  .map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href}>
                        <Link href={item.href}>
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </SidebarUI>
  );
}
