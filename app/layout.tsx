/**
 * Root Layout
 *
 * This is the root layout component that wraps all pages in the application.
 * It sets up:
 * - Global fonts (Geist Sans and Geist Mono)
 * - Global CSS styles
 * - HTML metadata (title, description)
 *
 * In Phase 4, we'll add:
 * - Authentication provider
 * - Theme provider
 * - Navigation components
 */

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { branding } from '@/config';

// Load Geist fonts from Google Fonts
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Page metadata using branding config
export const metadata: Metadata = {
  title: {
    default: `${branding.appName} | ${branding.organisationShortName}`,
    template: `%s | ${branding.appName}`,
  },
  description: branding.appDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
