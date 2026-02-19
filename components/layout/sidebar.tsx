'use client';

/**
 * Sidebar Navigation Component
 *
 * Responsive sidebar for the dashboard layout:
 * - Desktop: Fixed sidebar on the left with animated active indicator
 * - Mobile: Collapsible sheet (drawer) triggered by menu button
 *
 * Features:
 * - Navigation links to main sections
 * - Animated accent bar that slides between active items
 * - Admin-only sections (Users)
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { footerRandomText } from "@institute-alterna/footer-quotes"
import { strings } from '@/config';
import { Wordmark } from '@/components/shared/wordmark';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Settings,
  ScrollText,
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
    href: '/personnel',
    label: strings.nav.personnel,
    icon: Users,
    adminOnly: true,
  },
  {
    href: '/log',
    label: strings.auditLog.title,
    icon: ScrollText,
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
  const navRef = useRef<HTMLElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number } | null>(null);

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const updateIndicator = useCallback(() => {
    if (!navRef.current) return;
    const activeLink = navRef.current.querySelector<HTMLAnchorElement>('[aria-current="page"]');
    if (activeLink) {
      const navRect = navRef.current.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      setIndicatorStyle({
        top: linkRect.top - navRect.top,
        height: linkRect.height,
      });
    } else {
      setIndicatorStyle(null);
    }
  }, []);

  useEffect(() => {
    updateIndicator();
  }, [pathname, updateIndicator]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-full flex-col border-r border-border/50 bg-background/80 backdrop-blur-xl',
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
          <Wordmark className={cn('h-7 w-auto text-foreground', collapsed && 'h-6')} />
        </div>

        {/* Navigation */}
        <nav ref={navRef} className="relative flex-1 space-y-1 p-2" aria-label="Main navigation">
          {/* Animated active indicator bar */}
          {indicatorStyle && (
            <div
              className="absolute left-0 w-[3px] rounded-full bg-primary transition-all duration-300 ease-in-out"
              style={{
                top: indicatorStyle.top + 6,
                height: indicatorStyle.height - 12,
              }}
            />
          )}
          {filteredNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                  'hover:bg-accent/40 hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-accent/50 text-foreground'
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
            'border-t p-4 text-xs text-muted-foreground opacity-50',
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
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
              'hover:bg-accent/40 hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-accent/50 text-foreground border-l-[3px] border-primary'
                : 'text-muted-foreground border-l-[3px] border-transparent'
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
