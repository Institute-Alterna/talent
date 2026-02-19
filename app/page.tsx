/**
 * Home Page / Login Page
 *
 * Full-screen opaque login with minimal form and loading state.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { LoginForm } from '@/components/shared/login-form';

export default async function Home() {
  const session = await auth();

  // If user is already logged in, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  return <LoginForm />;
}
