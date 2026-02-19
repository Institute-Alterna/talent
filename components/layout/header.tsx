'use client';

/**
 * Header Component
 *
 * Top navigation bar with:
 * - Mobile menu toggle
 * - User menu (profile, settings, logout)
 *
 * Radix UI primitives (Sheet, DropdownMenu) are deferred to client-only
 * rendering to prevent hydration mismatches caused by useId() counter
 * differences between SSR and client hydration.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useMounted } from '@/hooks/use-mounted';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { MobileNav } from './sidebar';
import { branding, strings } from '@/config';

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    title?: string | null;
    firstName?: string | null;
    displayName?: string | null;
    isAdmin?: boolean;
  };
  onSignOut: () => void;
}

export function Header({ user, onSignOut }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Track client-side mounting to avoid Radix useId() hydration mismatch
  const mounted = useMounted();

  // Route-based page title and subtitle
  const pageInfo = getPageInfo(pathname);

  // Short name for topbar: prefer firstName
  const shortName = user.firstName || user.displayName || user.name || user.email || 'User';
  // Full name for dropdown menu
  const fullName = user.displayName || user.name || user.email || 'User';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl pl-5 pr-4 md:px-6">
      {/* Mobile menu button — deferred to client to avoid Radix ID hydration mismatch */}
      {mounted ? (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-background/95 backdrop-blur-xl">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
                  {branding.organisationShortName.charAt(0)}
                </div>
                {branding.appName}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <MobileNav
                isAdmin={user.isAdmin}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation menu"
          disabled
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Page Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {pageInfo && (
          <div className="min-w-0">
            <h1 className="text-sm font-semibold leading-none truncate">{pageInfo.title}</h1>
            {pageInfo.subtitle && (
              <p className="text-xs text-muted-foreground leading-none mt-1 hidden md:block truncate">{pageInfo.subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* User menu — deferred to client to avoid Radix ID hydration mismatch */}
      {mounted ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2"
              aria-label="User menu"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium">{shortName}</span>
                <div className="hidden items-center gap-1 md:flex">
                  <span className="text-xs text-muted-foreground">
                    {user.title}
                  </span>
                  {user.isAdmin && (
                    <Badge className="h-4 px-1 text-[10px] bg-primary/10 text-primary border-primary/20">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{fullName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex cursor-pointer items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>{strings.nav.settings}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{strings.nav.logout}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2"
          aria-label="User menu"
          disabled
        >
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">{shortName}</span>
            <div className="hidden items-center gap-1 md:flex">
              <span className="text-xs text-muted-foreground">
                {user.title}
              </span>
              {user.isAdmin && (
                <Badge className="h-4 px-1 text-[10px] bg-primary/10 text-primary border-primary/20">
                  Admin
                </Badge>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </header>
  );
}

/** Map pathname to page title and subtitle */
function getPageInfo(pathname: string): { title: string; subtitle: string } | null {
  if (pathname.startsWith('/dashboard')) return { title: 'Dashboard', subtitle: 'Overview' };
  if (pathname.startsWith('/candidates')) return { title: 'Candidates', subtitle: 'Recruitment pipeline' };
  if (pathname.startsWith('/personnel')) return { title: 'Personnel', subtitle: 'Manage team & permissions' };
  if (pathname.startsWith('/log')) return { title: 'Audit Log', subtitle: 'System activity history' };
  if (pathname.startsWith('/settings')) return { title: 'Settings', subtitle: 'Preferences & profile' };
  return null;
}
