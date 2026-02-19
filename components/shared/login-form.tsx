'use client';

/**
 * Login Form Component
 *
 * Client-side login form with loading state animation.
 * Renders a full-screen opaque background (white in light mode, black in dark mode).
 * Uses an inline SVG wordmark with currentColor for automatic dark/light mode switching.
 */

import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { signInWithOkta } from '@/app/actions';
import { branding, strings } from '@/config';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/shared/wordmark';

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
        {/* Wordmark — inline SVG uses currentColor, adapts to dark/light mode */}
        <div className="flex justify-center md:justify-start">
          <Wordmark className="h-12 w-auto text-black dark:text-white" />
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
