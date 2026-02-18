'use client';

/**
 * Dashboard Layout Component
 *
 * Main layout wrapper for authenticated pages:
 * - Sidebar navigation (desktop)
 * - Header with mobile navigation
 * - Main content area with scroll
 *
 * This component handles the responsive layout switching between
 * desktop (sidebar) and mobile (header drawer) navigation.
 */

import { useTransition } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { signOutAction } from '@/app/actions';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    firstName?: string | null;
    displayName?: string | null;
    title?: string | null;
    isAdmin?: boolean;
  };
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(() => {
      signOutAction();
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar isAdmin={user.isAdmin} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header user={user} onSignOut={handleSignOut} />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-8 max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Loading overlay during sign out */}
      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-2 text-sm text-muted-foreground">Signing out...</p>
          </div>
        </div>
      )}
    </div>
  );
}
