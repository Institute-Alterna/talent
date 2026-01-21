/**
 * Candidates Page
 *
 * Main page for viewing and managing candidates in the pipeline.
 * Displays a Kanban-style board with applications organized by stage.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CandidatesPageClient } from './page-client';

export const metadata = {
  title: 'Candidates',
};

export default async function CandidatesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  if (!session.user.hasAccess) {
    redirect('/auth/error?error=AccessDenied');
  }

  return <CandidatesPageClient isAdmin={session.user.isAdmin} />;
}
