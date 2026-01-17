/**
 * Authentication Error Page
 *
 * Displays error information when authentication fails.
 * Common errors:
 * - Configuration: OAuth provider misconfigured
 * - AccessDenied: User denied access
 * - Verification: Email verification issue
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Configuration Error',
    description:
      'There is a problem with the server configuration. Please check that OKTA_CLIENT_ID, OKTA_CLIENT_SECRET, and OKTA_ISSUER are correctly set.',
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to sign in. Please contact an administrator.',
  },
  Verification: {
    title: 'Verification Error',
    description: 'The verification link may have expired or already been used.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An error occurred during authentication. Please try again.',
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error || 'Default';
  const errorInfo = errorMessages[error] || errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-destructive">{errorInfo.title}</CardTitle>
          <CardDescription>Authentication failed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground">{errorInfo.description}</p>

          {error === 'Configuration' && (
            <div className="rounded-lg bg-muted p-4 text-xs">
              <p className="font-medium mb-2">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Verify OKTA_ISSUER is a valid URL</li>
                <li>Check OKTA_CLIENT_ID matches your Okta app</li>
                <li>Ensure OKTA_CLIENT_SECRET is correct</li>
                <li>Confirm redirect URI in Okta matches your app URL</li>
              </ul>
            </div>
          )}

          <div className="flex justify-center">
            <Button asChild>
              <Link href="/">Try Again</Link>
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-lg bg-muted p-4 text-xs">
              <p className="font-medium mb-2">Debug Info (dev only):</p>
              <p className="text-muted-foreground">Error code: {error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
