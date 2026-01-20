/**
 * Email Preview Route (Development Only)
 *
 * Renders email templates in the browser for visual testing.
 * Protected by NODE_ENV check - returns 404 in production.
 *
 * Usage:
 *   GET /api/debug/email-preview?template=offer-letter&format=html
 *   GET /api/debug/email-preview?template=application-received&format=text
 *   GET /api/debug/email-preview (lists available templates)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  renderTemplate,
  htmlToPlainText,
  EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_META,
  escapeHtml,
  type EmailTemplateName,
} from '@/lib/email';

// Sample data for template preview
const SAMPLE_VARIABLES: Record<string, string> = {
  // Person info
  PERSON_FIRST_NAME: 'Alex',
  PERSON_FULL_NAME: 'Alex Johnson',
  PERSON_EMAIL: 'alex.johnson@example.com',

  // Application info
  POSITION: 'Software Engineer',
  APPLICATION_DATE: 'Monday, January 19, 2026',
  START_DATE: 'Monday, February 2, 2026',

  // Assessment scores
  GC_SCORE: '85',
  GC_THRESHOLD: '70',
  SC_SCORE: '82',
  SC_THRESHOLD: '75',

  // Interview
  INTERVIEWER_NAME: 'Sarah Martinez',
  SCHEDULING_LINK: 'https://cal.com/alterna/interview',
  INTERVIEW_DURATION: '25-30 minutes',

  // Assessment links
  GC_ASSESSMENT_LINK: 'https://tally.so/r/woqXNx?who=sample-person-id',
  SC_ASSESSMENT_LINK: 'https://tally.so/r/specialized?who=sample-person-id&applicationId=sample-app-id',

  // Account credentials
  ALTERNA_EMAIL: 'alex.johnson@alterna.dev',
  TEMPORARY_PASSWORD: '*******',
  LOGIN_URL: 'https://talent.alterna.dev/auth/signin',

  // Optional content
  ADDITIONAL_DETAILS: `
    <p style="margin: 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
      <strong>Additional Information:</strong><br>
      Your compensation and benefits package will be discussed during onboarding.
    </p>
  `,
  REJECTION_REASON: `
    <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
      While you demonstrated strong skills, we ultimately selected a candidate whose experience more closely aligned with our current project needs.
    </p>
  `,
};

export async function GET(request: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const templateName = searchParams.get('template');
  const format = searchParams.get('format') || 'html';

  // If no template specified, show available templates
  if (!templateName) {
    const templates = Object.entries(EMAIL_TEMPLATES).map(([key, value]) => ({
      id: value,
      name: key,
      subject: EMAIL_TEMPLATE_META[value as EmailTemplateName]?.subject || 'N/A',
      description: EMAIL_TEMPLATE_META[value as EmailTemplateName]?.description || 'N/A',
      previewUrl: `/api/debug/email-preview?template=${value}`,
      textPreviewUrl: `/api/debug/email-preview?template=${value}&format=text`,
    }));

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template Preview</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #f4f4f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #18181b; margin-bottom: 8px; }
    .subtitle { color: #71717a; margin-bottom: 32px; }
    .template { padding: 16px; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 16px; }
    .template:hover { border-color: #a1a1aa; }
    .template-name { font-weight: 600; color: #18181b; margin-bottom: 4px; }
    .template-id { font-family: monospace; font-size: 12px; color: #71717a; margin-bottom: 8px; }
    .template-desc { color: #3f3f46; font-size: 14px; margin-bottom: 12px; }
    .links { display: flex; gap: 12px; }
    .links a { font-size: 14px; color: #2563eb; text-decoration: none; }
    .links a:hover { text-decoration: underline; }
    .warning { background: #fef3c7; border: 1px solid #fcd34d; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; color: #92400e; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📧 Email Template Preview</h1>
    <p class="subtitle">Development-only tool for previewing email templates</p>
    
    <div class="warning">
      ⚠️ This page is only available in development mode.
    </div>

    ${templates
      .map(
        (t) => `
      <div class="template">
        <div class="template-name">${t.name.replace(/_/g, ' ')}</div>
        <div class="template-id">${t.id}</div>
        <div class="template-desc">${t.description}</div>
        <div class="links">
          <a href="${t.previewUrl}" target="_blank">View HTML</a>
          <a href="${t.textPreviewUrl}" target="_blank">View Plain Text</a>
        </div>
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Validate template name
  const validTemplates = Object.values(EMAIL_TEMPLATES);
  if (!validTemplates.includes(templateName as EmailTemplateName)) {
    return NextResponse.json(
      {
        error: 'Invalid template',
        validTemplates,
      },
      { status: 400 }
    );
  }

  // Render the template
  const { html, text, subject } = renderTemplate(
    templateName as EmailTemplateName,
    SAMPLE_VARIABLES
  );

  if (format === 'text') {
    // Return plain text version
    const plainText = text || (html ? htmlToPlainText(html) : 'Template not found');
    return new NextResponse(
      `Subject: ${subject}\n\n${'='.repeat(50)}\n\n${plainText}`,
      {
        headers: { 'Content-Type': 'text/plain' },
      }
    );
  }

  // Return HTML with subject header
  if (!html) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const wrappedHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview: ${escapeHtml(templateName)}</title>
  <style>
    body { margin: 0; padding: 0; }
    .preview-bar { 
      position: sticky; 
      top: 0; 
      background: #18181b; 
      color: white; 
      padding: 12px 20px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
    }
    .preview-bar a { color: #60a5fa; text-decoration: none; }
    .preview-bar a:hover { text-decoration: underline; }
    .subject { color: #a1a1aa; }
    .subject strong { color: white; }
  </style>
</head>
<body>
  <div class="preview-bar">
    <div class="subject"><strong>Subject:</strong> ${escapeHtml(subject)}</div>
    <div>
      <a href="/api/debug/email-preview">← All Templates</a>
      &nbsp;|&nbsp;
      <a href="?template=${encodeURIComponent(templateName)}&format=text">View as Text</a>
    </div>
  </div>
  ${html}
</body>
</html>
  `;

  return new NextResponse(wrappedHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}
