/**
 * Home Page
 *
 * This is a temporary landing page to verify the project setup is working.
 * It will be replaced with the actual dashboard in Phase 4.
 */

import { branding, strings } from '@/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{branding.appName}</CardTitle>
          <CardDescription>{branding.organisationName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            {strings.dashboard.welcome}! This is a placeholder page.
          </p>
          <div className="flex flex-col gap-2">
            <Button className="w-full">Sign In with Okta</Button>
            <p className="text-center text-xs text-muted-foreground">
              Authentication will be implemented in Phase 3
            </p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <h3 className="mb-2 text-sm font-medium">Setup Status</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>✅ Next.js 14 with App Router</li>
              <li>✅ TypeScript</li>
              <li>✅ Tailwind CSS</li>
              <li>✅ shadcn/ui components</li>
              <li>✅ ESLint + Prettier</li>
              <li>✅ Jest + React Testing Library</li>
              <li>✅ Config files integrated</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
