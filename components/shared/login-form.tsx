'use client';

/**
 * Login Form Component
 *
 * Client-side login form with loading state animation.
 * Renders a full-screen opaque background (white in light mode, black in dark mode).
 */

import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { signInWithOkta } from '@/app/actions';
import { branding, strings } from '@/config';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(() => {
      signInWithOkta();
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center md:justify-start bg-white dark:bg-black">
      <div className="w-full max-w-sm space-y-8 px-8 md:ml-[12vw]">
        {/* Content */}
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white">
            {branding.appName}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            {branding.organisationShortName}
          </p>
        </div>

        {/* Sign-in form */}
        <form action={handleSubmit} className="space-y-4">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating…
              </>
            ) : (
              <>
                {strings.login.action} {branding.authProviderName}
              </>
            )}
          </Button>
        </form>

        {/* Footer note */}
        <p className="text-center md:text-left text-xs text-neutral-400 dark:text-neutral-500">
          {strings.login.subtitle}
        </p>
      </div>
    </div>
  );
}
