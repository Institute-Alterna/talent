/**
 * Home Page / Login Page
 *
 * This is the landing page that handles authentication:
 * - If logged in: redirects to dashboard
 * - If not logged in: shows sign in button
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { signInWithOkta } from './actions';
import { branding, strings } from '@/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function Home() {
  const session = await auth();

  // If user is already logged in, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{branding.appName}</CardTitle>
          <CardDescription>{branding.organisationShortName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground">
            {strings.dashboard.welcome} to the talent management system.
          </p>

          <form action={signInWithOkta}>
            <Button type="submit" className="w-full" size="lg">
              {strings.login.action} {branding.authProviderName}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            {strings.login.subtitle}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
