/**
 * Settings Page
 *
 * User settings page where users can:
 * - View their profile information
 * - Set their scheduling link (Cal.com/Calendly)
 * - View activity history
 *
 * This is a placeholder that will be fully implemented in Phase 5.
 */

import { auth } from '@/lib/auth';
import { strings } from '@/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Calendar, User, History } from 'lucide-react';

export const metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{strings.settings.title}</h1>
        <p className="text-muted-foreground">
          Manage your profile and preferences
        </p>
      </div>

      {/* Scheduling Link Warning */}
      <Card className="border-warning bg-warning/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-warning">
            <AlertCircle className="h-5 w-5" />
            {strings.settings.schedulingLinkMissing}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {strings.settings.schedulingLinkHelp}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {strings.settings.profile}
            </CardTitle>
            <CardDescription>
              Your profile information from Okta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium">{user?.name || '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{user?.email || '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant={user?.isAdmin ? 'default' : 'secondary'}>
                  {user?.isAdmin ? strings.users.admin : strings.users.hiringManager}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">User ID</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {user?.id?.slice(0, 8) || '-'}...
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Profile information is managed in Okta. Changes sync on next login.
            </p>
          </CardContent>
        </Card>

        {/* Scheduling Link Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {strings.settings.schedulingLink}
            </CardTitle>
            <CardDescription>
              {strings.settings.schedulingLinkHelp}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-dashed p-4">
              <p className="text-center text-sm text-muted-foreground">
                No scheduling link configured
              </p>
            </div>
            <Button className="w-full" disabled>
              Set Scheduling Link
            </Button>
            <p className="text-xs text-muted-foreground">
              Full implementation coming in Phase 5
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {strings.settings.activityHistory}
          </CardTitle>
          <CardDescription>
            Your recent actions in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>{strings.empty.noActivity}</p>
              <p className="mt-4 text-xs">
                Full implementation coming in Phase 5
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
