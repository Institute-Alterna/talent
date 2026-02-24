/**
 * Competencies Page
 *
 * Management page for specialised competency definitions.
 * Displays a grid of competency cards with category filtering.
 * Admins can create, edit, and deactivate competencies.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CompetenciesPageClient } from './page-client';

export const metadata = {
  title: 'Competencies',
};

export default async function CompetenciesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  if (!session.user.hasAccess) {
    redirect('/auth/error?error=AccessDenied');
  }

  return <CompetenciesPageClient isAdmin={session.user.isAdmin} />;
}
