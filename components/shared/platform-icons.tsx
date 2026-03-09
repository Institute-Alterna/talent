import { Github, Globe, Linkedin } from 'lucide-react';
import type { PortfolioLinkPlatform } from '@/lib/utils';

interface IconProps {
  className?: string;
}

export function OneDriveIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12.5 8.5a5 5 0 0 1 4.8 3.6A3.5 3.5 0 0 1 17 19H7a4 4 0 0 1-.8-7.9A5 5 0 0 1 12.5 8.5Z" />
      <path d="M6.2 11.1A4 4 0 0 0 3 15a4 4 0 0 0 4 4h1" />
    </svg>
  );
}

export function GoogleDriveIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8.5 2L15.5 2L22 14H15L8.5 2Z" />
      <path d="M2 14L8.5 2L15 14H2Z" />
      <path d="M2 14L5.5 21H18.5L15 14" />
    </svg>
  );
}

const PLATFORM_ICONS: Record<PortfolioLinkPlatform, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  github: Github,
  onedrive: OneDriveIcon,
  'google-drive': GoogleDriveIcon,
  generic: Globe,
};

const PLATFORM_LABELS: Record<PortfolioLinkPlatform, string> = {
  linkedin: 'LinkedIn Profile',
  github: 'GitHub Profile',
  onedrive: 'OneDrive Portfolio',
  'google-drive': 'Google Drive Portfolio',
  generic: 'View Portfolio',
};

export function getPortfolioIcon(
  platform: PortfolioLinkPlatform
): React.ComponentType<{ className?: string }> {
  return PLATFORM_ICONS[platform];
}

export function getPortfolioLinkLabel(platform: PortfolioLinkPlatform): string {
  return PLATFORM_LABELS[platform];
}
