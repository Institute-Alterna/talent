'use client';

/**
 * Sidebar Navigation Component
 *
 * Responsive sidebar for the dashboard layout:
 * - Desktop: Fixed sidebar on the left
 * - Mobile: Collapsible sheet (drawer) triggered by menu button
 *
 * Features:
 * - Navigation links to main sections
 * - Active state indication
 * - Admin-only sections (Users)
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { footerRandomText } from "@institute-alterna/footer-quotes"
import { strings, branding } from '@/config';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: strings.nav.dashboard,
    icon: LayoutDashboard,
  },
  {
    href: '/candidates',
    label: strings.nav.candidates,
    icon: UserCircle,
  },
  {
    href: '/users',
    label: strings.nav.personnel,
    icon: Users,
    adminOnly: true,
  },
  {
    href: '/settings',
    label: strings.nav.settings,
    icon: Settings,
  },
];

interface SidebarProps {
  isAdmin?: boolean;
  collapsed?: boolean;
}

export function Sidebar({ isAdmin = false, collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-full flex-col border-r bg-card',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo/Brand */}
        <div
          className={cn(
            'flex h-16 items-center border-b px-4',
            collapsed ? 'justify-center' : 'gap-2'
          )}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold"
            aria-hidden="true"
          >
            {branding.organisationShortName.charAt(0)}
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground">
              {branding.appName}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2" aria-label="Main navigation">
          {filteredNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                  collapsed && 'justify-center px-2'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>

        {/* Footer */}
        <div
          className={cn(
            'border-t p-4 text-xs text-muted-foreground',
            collapsed && 'text-center'
          )}
        >
          {collapsed ? (
            /* Uncomment this if you want to add dynamic year and organisation name,
            but Alterna uses a random quote instead!
            <span>&copy;</span>
            */
           <span suppressHydrationWarning>{footerRandomText()}</span>
          ) : (
            <span suppressHydrationWarning>{footerRandomText()}</span>
            /*
            <span>&copy; {new Date().getFullYear()} {branding.copyrightText}</span>
            */
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

/**
 * Mobile-friendly navigation items for use in Sheet component
 */
export function MobileNav({
  isAdmin = false,
  onNavigate,
}: {
  isAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
      {filteredNavItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
