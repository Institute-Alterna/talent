import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validate if a string is a valid UUID v4
 *
 * @param id - String to validate
 * @returns true if valid UUID v4
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate if a string is a valid URL
 *
 * @param url - String to validate
 * @returns true if valid URL with http or https protocol
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Format a date for display
 *
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    return d.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    });
  } catch {
    return '';
  }
}

/**
 * Format a date with time for display
 *
 * @param date - Date to format
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    return d.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

/**
 * Format a short date for display (D MMM, e.g., 21 Jan)
 *
 * @param date - Date to format
 * @returns Formatted short date string
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  return formatDate(date, { day: 'numeric', month: 'short', year: undefined });
}

/**
 * ISO 3166-1 alpha-2 country codes to full names
 * Based on countries defined in config/recruitment.ts
 */
export const COUNTRY_CODES: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',
  GT: 'Guatemala',
  SV: 'El Salvador',
  HN: 'Honduras',
  NI: 'Nicaragua',
  CR: 'Costa Rica',
  PA: 'Panama',
  CO: 'Colombia',
  VE: 'Venezuela',
  EC: 'Ecuador',
  PE: 'Peru',
  BR: 'Brazil',
  AR: 'Argentina',
  CL: 'Chile',
  ES: 'Spain',
  // Add more as needed
};

/**
 * Get the full country name from a country code
 *
 * @param code - ISO 3166-1 alpha-2 country code
 * @returns Full country name or the original code if not found
 */
export function getCountryName(code: string | null | undefined): string {
  if (!code) return '';
  const upper = code.toUpperCase().trim();
  return COUNTRY_CODES[upper] || code;
}