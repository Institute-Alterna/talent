/**
 * Home Page / Login Page
 *
 * Full-screen split layout with branded gradient and minimal form.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { signInWithOkta } from './actions';
import { branding, strings } from '@/config';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default async function Home() {
  const session = await auth();

  // If user is already logged in, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Brand Gradient (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[oklch(0.42_0.11_255)] to-[oklch(0.55_0.13_255)] items-center justify-center overflow-hidden">
        {/* Subtle dot grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
        
        {/* Centered logo and org name */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Image
            src="/talentLogo.svg"
            alt={branding.organisationName}
            width={48}
            height={48}
            priority
          />
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {branding.organisationName}
          </h1>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex justify-center">
            <Image
              src="/talentLogo.svg"
              alt={branding.organisationName}
              width={32}
              height={32}
              priority
              className="opacity-80"
              style={{ filter: 'hue-rotate(0deg) saturate(1.2)' }}
            />
          </div>

          {/* Content */}
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              {branding.appName}
            </h2>
            <p className="text-muted-foreground">
              {branding.organisationShortName}
            </p>
          </div>

          {/* Sign-in form */}
          <form action={signInWithOkta} className="space-y-4">
            <Button type="submit" className="w-full" size="lg">
              {strings.login.action} {branding.authProviderName}
            </Button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground">
            {strings.login.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
