/**
 * Settings Page
 *
 * User settings page where users can:
 * - View their profile information
 * - Set their scheduling link (Cal.com/Calendly)
 * - View activity history
 */

import { auth } from '@/lib/auth';
import { SettingsClient } from './page-client';

export const metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <SettingsClient
      initialUser={{
        name: user?.name,
        email: user?.email,
        isAdmin: user?.isAdmin ?? false,
        dbUserId: user?.dbUserId,
      }}
    />
  );
}
