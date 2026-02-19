'use client';

/**
 * RoleBadge Component
 *
 * Displays a user's role as a styled badge.
 * Replaces duplicated admin/hiring-manager/no-access badge logic.
 */

import { Badge } from '@/components/ui/badge';
import { Ban } from 'lucide-react';
import { strings } from '@/config';

interface RoleBadgeProps {
  isAdmin: boolean;
  hasAppAccess: boolean;
  /** User is deprovisioned / dismissed */
  isDismissed?: boolean;
}

export function RoleBadge({ isAdmin, hasAppAccess, isDismissed }: RoleBadgeProps) {
  if (isDismissed) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Ban className="h-3 w-3" />
        Dismissed
      </Badge>
    );
  }

  if (isAdmin) {
    return <Badge variant="default">{strings.personnel.admin}</Badge>;
  }

  if (hasAppAccess) {
    return <Badge variant="secondary">{strings.personnel.hiringManager}</Badge>;
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      {strings.personnel.noAccess}
    </Badge>
  );
}
