'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useSessionTimeout } from '@/lib/hooks/use-session-timeout';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { SessionTimeoutDialog } from '@/components/layout/session-timeout-dialog';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { showWarning, secondsLeft, stayLoggedIn, logout } = useSessionTimeout();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <OfflineBanner />
          <main className="flex-1 p-4 md:p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
      <SessionTimeoutDialog
        open={showWarning}
        secondsLeft={secondsLeft}
        onStay={stayLoggedIn}
        onLogout={logout}
      />
    </SidebarProvider>
  );
}
