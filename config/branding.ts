/**
 * Branding Configuration
 *
 * Customize the visual identity of the talent management system.
 * Update these values to match your organization's branding.
 */

export const branding = {
  // Organization name displayed throughout the application
  organisationName: 'Institute Alterna',
  organisationShortName: 'Alterna',

  // Auth mechanism name (e.g., Okta, Azure AD)
  authProviderName: 'Universal Access',
  authProviderShortName: 'UA',

  // Primary brand color (used for headers, buttons, links)
  primaryColor: '#2E5090',

  // Secondary brand color (used for accents, hover states)
  secondaryColor: '#4472C4',

  // Status colors
  successColor: '#22C55E',
  warningColor: '#F59E0B',
  dangerColor: '#EF4444',

  // Logo paths (relative to /public directory)
  logoPath: '/talentLogo.svg',
  logoDarkPath: '/logos/alterna-logo-dark.svg',
  faviconPath: '/logos/favicon.ico',

  // Application metadata
  appName: 'Talent Management',
  appDescription: 'Candidate tracking and recruitment management system',

  // Footer text
  copyrightText: 'Alterna',
} as const;

export type Branding = typeof branding;
