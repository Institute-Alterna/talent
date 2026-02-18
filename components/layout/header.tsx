'use client';

/**
 * Header Component
 *
 * Top navigation bar with:
 * - Mobile menu toggle
 * - Page title
 * - User menu (profile, settings, logout)
 */

import { useState } from 'react';
import Link from 'next/link';
import { Menu, LogOut, Settings, User, ChevronDown } from 'lucide-react';
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
import { ThemeToggle } from '@/components/shared/theme-toggle';
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

  // Get display name: prefer firstName, then displayName, then name, then email
  const displayName = user.firstName || user.displayName || user.name || user.email || 'User';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 md:px-6">
      {/* Mobile menu button */}
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2"
            aria-label="User menu"
          >
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-medium">{displayName}</span>
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
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex cursor-pointer items-center">
              <User className="mr-2 h-4 w-4" />
              <span>{strings.settings.profile}</span>
            </Link>
          </DropdownMenuItem>
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
    </header>
  );
}
