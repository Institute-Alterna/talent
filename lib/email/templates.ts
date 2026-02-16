/**
 * Email Template Engine
 *
 * Handles loading, caching, and rendering of email templates.
 * Templates use {{VARIABLE_NAME}} syntax for variable replacement.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  getCommonVariables,
  EMAIL_TEMPLATE_META,
  type EmailTemplateName,
} from './config';
import { sanitizeForLog } from '@/lib/security';
import { formatDate } from '@/lib/utils';

/**
 * Template cache to avoid repeated file reads
 */
const templateCache = new Map<string, string>();

/**
 * Get the templates directory path
 */
function getTemplatesDir(): string {
  return join(process.cwd(), 'emails');
}

/**
 * Load a template from disk
 *
 * @param templateName - Name of the template file (without extension)
 * @param format - 'html' or 'txt'
 * @returns Template content or null if not found
 */
export function loadTemplate(templateName: string, format: 'html' | 'txt' = 'html'): string | null {
  const cacheKey = `${templateName}.${format}`;

  // Check cache first
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }

  const templatePath = join(getTemplatesDir(), `${templateName}.${format}`);

  if (!existsSync(templatePath)) {
    console.warn(`[Email] Template not found: ${sanitizeForLog(templatePath)}`);
    return null;
  }

  try {
    const content = readFileSync(templatePath, 'utf-8');
    templateCache.set(cacheKey, content);
    return content;
  } catch (error) {
    console.error(`[Email] Failed to load template ${sanitizeForLog(templatePath)}: ${sanitizeForLog(error instanceof Error ? error.message : String(error))}`);
    return null;
  }
}

/**
 * Clear the template cache
 *
 * Useful during development when templates change.
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Replace variables in a template string
 *
 * Variables use {{VARIABLE_NAME}} syntax.
 * Supports nested replacement (variables can contain other variables).
 *
 * @param template - Template string with {{VARIABLE}} placeholders
 * @param variables - Object of variable name -> value mappings
 * @returns Rendered template with variables replaced
 */
export function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;

  // Replace all variables
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }

  return result;
}

/**
 * Render an email template with variables
 *
 * @param templateName - Name of the template
 * @param variables - Custom variables for this email
 * @returns Rendered HTML and text content, plus subject line
 */
export function renderTemplate(
  templateName: EmailTemplateName,
  variables: Record<string, string> = {}
): {
  html: string | null;
  text: string | null;
  subject: string;
} {
  // Merge common variables with custom ones
  const allVariables = {
    ...getCommonVariables(),
    ...variables,
  };

  // Load HTML template
  const htmlTemplate = loadTemplate(templateName, 'html');
  const html = htmlTemplate ? replaceVariables(htmlTemplate, allVariables) : null;

  // Load text template (fallback)
  const textTemplate = loadTemplate(templateName, 'txt');
  const text = textTemplate ? replaceVariables(textTemplate, allVariables) : null;

  // Get subject from metadata and replace variables
  const meta = EMAIL_TEMPLATE_META[templateName];
  const subject = replaceVariables(meta?.subject || 'Message from Institute Alterna', allVariables);

  // Warn about missing variables in development
  if (process.env.NODE_ENV === 'development') {
    const contentToCheck = [html, text, subject].filter(Boolean).join('\n');
    const missing = findMissingVariables(contentToCheck, allVariables);
    if (missing.length > 0) {
      console.warn(
        `[Email] Template "${sanitizeForLog(templateName)}" has unreplaced variables: ${sanitizeForLog(missing.join(', '))}`
      );
    }
  }

  return { html, text, subject };
}

/**
 * Generate plain text from HTML
 *
 * Simple conversion for emails without a dedicated text template.
 * Strips HTML tags and normalizes whitespace.
 *
 * @param html - HTML content
 * @returns Plain text version
 */
export function htmlToPlainText(html: string): string {
  let result = html
    // Replace line breaks with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Replace paragraphs with double newlines
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    // Replace list items with bullets
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    // Replace headings with newlines
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<h[1-6][^>]*>/gi, '');

  // Remove all HTML tags using loop to prevent bypasses like <scr<script>ipt>
  let prev;
  do {
    prev = result;
    result = result.replace(/<[^>]*>/g, '');
  } while (result !== prev);

  return (
    result
      // Decode common HTML entities (decode &amp; LAST to prevent double-unescaping)
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Validate that all required variables are present
 *
 * @param template - Template string
 * @param variables - Provided variables
 * @returns Array of missing variable names
 */
export function findMissingVariables(
  template: string,
  variables: Record<string, string>
): string[] {
  const variablePattern = /\{\{([A-Z0-9_]+)\}\}/g;
  const missing: string[] = [];
  let match;

  while ((match = variablePattern.exec(template)) !== null) {
    const varName = match[1];
    if (!(varName in variables)) {
      missing.push(varName);
    }
  }

  return [...new Set(missing)]; // Remove duplicates
}

/**
 * Build assessment link URL
 *
 * @param baseUrl - Base Tally form URL
 * @param personId - Person ID to embed
 * @param applicationId - Optional application ID
 * @returns Full URL with parameters
 */
export function buildAssessmentLink(
  baseUrl: string,
  personId: string,
  applicationId?: string
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('who', personId);
  if (applicationId) {
    url.searchParams.set('applicationId', applicationId);
  }
  return url.toString();
}

/**
 * Format date for email display
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatEmailDate(date: Date): string {
  // Use shared helper with weekday included for consistent formatting
  return formatDate(date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Escape HTML characters to prevent XSS in templates
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
