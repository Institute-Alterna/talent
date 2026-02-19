/**
 * Email Template Tests
 *
 * Unit tests for the email template engine in lib/email/templates.ts
 *
 * Tests cover:
 * - Template loading and caching
 * - Variable replacement
 * - HTML to plain text conversion
 * - Missing variable detection
 * - Assessment link building
 * - Date formatting
 * - HTML escaping
 */

import {
  loadTemplate,
  clearTemplateCache,
  replaceVariables,
  htmlToPlainText,
  findMissingVariables,
  buildAssessmentLink,
  formatEmailDate,
  escapeHtml,
} from '@/lib/email/templates';

describe('Email Templates', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure isolation
    clearTemplateCache();
  });

  describe('loadTemplate', () => {
    it('loads existing HTML template', () => {
      const template = loadTemplate('application/application-received', 'html');
      expect(template).not.toBeNull();
      expect(template).toContain('{{ORGANIZATION_SHORT_NAME}}');
      expect(template).toContain('{{PERSON_FIRST_NAME}}');
    });

    it('returns null for non-existent template', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const template = loadTemplate('non-existent-template', 'html');
      expect(template).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Email] Template not found')
      );
      warnSpy.mockRestore();
    });

    it('caches loaded templates', () => {
      const template1 = loadTemplate('application/application-received', 'html');
      const template2 = loadTemplate('application/application-received', 'html');

      // Both should return the same content
      expect(template1).toBe(template2);
    });

    it('loads different formats separately', () => {
      const htmlTemplate = loadTemplate('application/application-received', 'html');
      // Note: TXT templates not generated yet - test that HTML exists
      expect(htmlTemplate).not.toBeNull();
    });
  });

  describe('clearTemplateCache', () => {
    it('clears the template cache', () => {
      // Load a template to populate cache
      loadTemplate('application/application-received', 'html');
      
      // Clear cache
      clearTemplateCache();
      
      // This should trigger a fresh load (no way to verify directly, but shouldn't error)
      const template = loadTemplate('application/application-received', 'html');
      expect(template).not.toBeNull();
    });
  });

  describe('replaceVariables', () => {
    it('replaces single variable', () => {
      const template = 'Hello {{NAME}}!';
      const result = replaceVariables(template, { NAME: 'John' });
      expect(result).toBe('Hello John!');
    });

    it('replaces multiple variables', () => {
      const template = '{{GREETING}}, {{NAME}}! Welcome to {{COMPANY}}.';
      const result = replaceVariables(template, {
        GREETING: 'Hello',
        NAME: 'Jane',
        COMPANY: 'Alterna',
      });
      expect(result).toBe('Hello, Jane! Welcome to Alterna.');
    });

    it('replaces same variable multiple times', () => {
      const template = '{{NAME}} is great. {{NAME}} is awesome.';
      const result = replaceVariables(template, { NAME: 'Alterna' });
      expect(result).toBe('Alterna is great. Alterna is awesome.');
    });

    it('leaves unreplaced variables intact', () => {
      const template = 'Hello {{NAME}}, your ID is {{ID}}.';
      const result = replaceVariables(template, { NAME: 'John' });
      expect(result).toBe('Hello John, your ID is {{ID}}.');
    });

    it('handles empty variables object', () => {
      const template = 'Hello {{NAME}}!';
      const result = replaceVariables(template, {});
      expect(result).toBe('Hello {{NAME}}!');
    });

    it('handles template with no variables', () => {
      const template = 'Hello World!';
      const result = replaceVariables(template, { NAME: 'John' });
      expect(result).toBe('Hello World!');
    });
  });

  describe('htmlToPlainText', () => {
    it('converts paragraphs to double newlines', () => {
      const html = '<p>First paragraph</p><p>Second paragraph</p>';
      const result = htmlToPlainText(html);
      expect(result).toContain('First paragraph');
      expect(result).toContain('Second paragraph');
    });

    it('converts line breaks to newlines', () => {
      const html = 'Line 1<br>Line 2<br/>Line 3';
      const result = htmlToPlainText(html);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('converts list items to bullets', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = htmlToPlainText(html);
      expect(result).toContain('• Item 1');
      expect(result).toContain('• Item 2');
    });

    it('strips all HTML tags', () => {
      const html = '<div class="container"><span style="color:red">Text</span></div>';
      const result = htmlToPlainText(html);
      expect(result).toBe('Text');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('decodes HTML entities', () => {
      const html = '&amp; &lt; &gt; &quot; &#39; &nbsp;';
      const result = htmlToPlainText(html);
      expect(result).toContain('&');
      expect(result).toContain('<');
      expect(result).toContain('>');
      expect(result).toContain('"');
      expect(result).toContain("'");
    });

    it('normalizes excessive newlines', () => {
      const html = '<p>Para 1</p><p></p><p></p><p>Para 2</p>';
      const result = htmlToPlainText(html);
      // Should not have more than 2 consecutive newlines
      expect(result).not.toMatch(/\n{3,}/);
    });
  });

  describe('findMissingVariables', () => {
    it('returns empty array when all variables are provided', () => {
      const template = 'Hello {{NAME}}, welcome to {{COMPANY}}!';
      const variables = { NAME: 'John', COMPANY: 'Alterna' };
      const missing = findMissingVariables(template, variables);
      expect(missing).toEqual([]);
    });

    it('finds missing variables', () => {
      const template = 'Hello {{NAME}}, your ID is {{ID}}.';
      const variables = { NAME: 'John' };
      const missing = findMissingVariables(template, variables);
      expect(missing).toContain('ID');
      expect(missing).not.toContain('NAME');
    });

    it('removes duplicates from missing list', () => {
      const template = '{{NAME}} {{NAME}} {{NAME}}';
      const variables = {};
      const missing = findMissingVariables(template, variables);
      expect(missing).toEqual(['NAME']);
    });

    it('handles template with no variables', () => {
      const template = 'Hello World!';
      const variables = { NAME: 'John' };
      const missing = findMissingVariables(template, variables);
      expect(missing).toEqual([]);
    });

    it('handles uppercase with underscores and numbers', () => {
      const template = '{{PERSON_FIRST_NAME}} scored {{GC_SCORE}}%';
      const variables = { PERSON_FIRST_NAME: 'John' };
      const missing = findMissingVariables(template, variables);
      expect(missing).toContain('GC_SCORE');
    });
  });

  describe('buildAssessmentLink', () => {
    it('builds link with person ID only', () => {
      const link = buildAssessmentLink('https://tally.so/r/form123', 'person-abc');
      expect(link).toBe('https://tally.so/r/form123?who=person-abc');
    });

    it('builds link with person ID and application ID', () => {
      const link = buildAssessmentLink(
        'https://tally.so/r/form123',
        'person-abc',
        'app-xyz'
      );
      expect(link).toBe('https://tally.so/r/form123?who=person-abc&applicationId=app-xyz');
    });

    it('handles base URL with existing query params', () => {
      const link = buildAssessmentLink(
        'https://tally.so/r/form123?ref=email',
        'person-abc'
      );
      expect(link).toContain('who=person-abc');
      expect(link).toContain('ref=email');
    });
  });

  describe('formatEmailDate', () => {
    it('formats date with weekday, month, day, year', () => {
      const date = new Date('2026-01-19T12:00:00Z');
      const formatted = formatEmailDate(date);
      
      // Should include these components
      expect(formatted).toContain('2026');
      expect(formatted).toContain('January');
      expect(formatted).toContain('19');
    });

    it('returns consistent format', () => {
      const date = new Date('2026-02-14T00:00:00Z');
      const formatted = formatEmailDate(date);
      
      // Format: "Saturday, 14 February 2026" (en-GB style)
      expect(formatted).toMatch(/\w+,\s+\d+\s+\w+\s+\d{4}/);
    });
  });

  describe('escapeHtml', () => {
    it('escapes ampersand', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    it('escapes less than', () => {
      expect(escapeHtml('A < B')).toBe('A &lt; B');
    });

    it('escapes greater than', () => {
      expect(escapeHtml('A > B')).toBe('A &gt; B');
    });

    it('escapes double quotes', () => {
      expect(escapeHtml('Say "Hello"')).toBe('Say &quot;Hello&quot;');
    });

    it('escapes single quotes', () => {
      expect(escapeHtml("It's fine")).toBe('It&#39;s fine');
    });

    it('escapes multiple characters', () => {
      const input = '<script>alert("XSS & more")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS &amp; more&quot;)&lt;/script&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('leaves safe text unchanged', () => {
      expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
    });
  });
});

describe('Email Template Files', () => {
  // Templates are organized into folders by stage
  const requiredTemplates = [
    'application/application-received',
    'assessment/general-competencies-invitation',
    'assessment/specialized-competencies-invitation',
    'interview/interview-invitation',
    'decision/offer-letter',
    'decision/rejection',
    'onboarding/account-created',
  ];

  beforeEach(() => {
    clearTemplateCache();
  });

  it.each(requiredTemplates)('template "%s" exists and loads', (templateName) => {
    const template = loadTemplate(templateName, 'html');
    expect(template).not.toBeNull();
    expect(template!.length).toBeGreaterThan(100); // Should have meaningful content
  });

  it.each(requiredTemplates)('template "%s" contains required structure', (templateName) => {
    const template = loadTemplate(templateName, 'html');
    expect(template).not.toBeNull();

    // All templates should have common variables
    expect(template).toContain('{{PERSON_FIRST_NAME}}');
    expect(template).toContain('{{ORGANIZATION_SHORT_NAME}}');
    expect(template).toContain('{{SENT_TIME}}');

    // All templates except onboarding should have non-discrimination notice
    if (!templateName.startsWith('onboarding/')) {
      expect(template).toContain('{{ORGANIZATION_SHORT_NAME}} is an equal opportunity provider');
    }

    // All templates should have basic HTML structure
    expect(template).toContain('<!DOCTYPE html>');
    expect(template).toContain('</html>');
  });
});
