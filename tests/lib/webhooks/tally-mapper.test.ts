/**
 * Tally Field Mapper Tests
 *
 * Unit tests for extracting and mapping Tally webhook fields.
 */

import {
  findFieldByKey,
  getStringValue,
  getNumberValue,
  getFileUrl,
  isCheckboxSelected,
  extractPersonData,
  extractApplicationData,
  extractGCAssessmentData,
  
  validateRequiredFields,
  APPLICATION_FIELD_KEYS,
  PACKAGE_CHECKBOX_IDS,
  GC_ASSESSMENT_FIELD_KEYS,
  type TallyWebhookPayload,
  type TallyField,
} from '@/lib/webhooks/tally-mapper';

describe('Tally Field Mapper', () => {
  describe('findFieldByKey', () => {
    const fields: TallyField[] = [
      { key: 'question_abc123', label: 'Email', type: 'INPUT_EMAIL', value: 'test@example.com' },
      { key: 'question_def456_suffix', label: 'Hidden', type: 'HIDDEN_FIELDS', value: 'secret' },
    ];

    it('finds field by exact key', () => {
      const result = findFieldByKey(fields, 'question_abc123');
      expect(result?.value).toBe('test@example.com');
    });

    it('finds field by key prefix', () => {
      const result = findFieldByKey(fields, 'question_def456');
      expect(result?.value).toBe('secret');
    });

    it('returns undefined for non-existent key', () => {
      const result = findFieldByKey(fields, 'question_xyz');
      expect(result).toBeUndefined();
    });
  });

  describe('getStringValue', () => {
    it('returns trimmed string value', () => {
      const field: TallyField = { key: 'q1', label: 'Test', type: 'INPUT_TEXT', value: '  hello  ' };
      expect(getStringValue(field)).toBe('hello');
    });

    it('returns undefined for empty string', () => {
      const field: TallyField = { key: 'q1', label: 'Test', type: 'INPUT_TEXT', value: '   ' };
      expect(getStringValue(field)).toBeUndefined();
    });

    it('converts number to string', () => {
      const field: TallyField = { key: 'q1', label: 'Test', type: 'INPUT_NUMBER', value: 42 };
      expect(getStringValue(field)).toBe('42');
    });

    it('returns undefined for null value', () => {
      const field: TallyField = { key: 'q1', label: 'Test', type: 'INPUT_TEXT', value: null };
      expect(getStringValue(field)).toBeUndefined();
    });

    it('returns undefined for undefined field', () => {
      expect(getStringValue(undefined)).toBeUndefined();
    });

    it('returns undefined for array values', () => {
      const field: TallyField = { key: 'q1', label: 'Test', type: 'FILE_UPLOAD', value: [] };
      expect(getStringValue(field)).toBeUndefined();
    });
  });

  describe('getNumberValue', () => {
    it('returns number value directly', () => {
      const field: TallyField = { key: 'q1', label: 'Test', type: 'INPUT_NUMBER', value: 85.5 };
      expect(getNumberValue(field)).toBe(85.5);
    });

    it('parses string to number', () => {
      const field: TallyField = { key: 'q1', label: 'Test', type: 'INPUT_TEXT', value: '75' };
      expect(getNumberValue(field)).toBe(75);
    });

    it('returns undefined for non-numeric string', () => {
      const field: TallyField = { key: 'q1', label: 'Test', type: 'INPUT_TEXT', value: 'abc' };
      expect(getNumberValue(field)).toBeUndefined();
    });

    it('returns undefined for null value', () => {
      const field: TallyField = { key: 'q1', label: 'Test', type: 'INPUT_NUMBER', value: null };
      expect(getNumberValue(field)).toBeUndefined();
    });
  });

  describe('getFileUrl', () => {
    it('extracts URL from file upload array', () => {
      const field: TallyField = {
        key: 'q1',
        label: 'Resume',
        type: 'FILE_UPLOAD',
        value: [
          {
            id: 'file-1',
            name: 'resume.pdf',
            url: 'https://tally.so/files/resume.pdf',
            mimeType: 'application/pdf',
            size: 12345,
          },
        ],
      };
      expect(getFileUrl(field)).toBe('https://tally.so/files/resume.pdf');
    });

    it('returns undefined for empty array', () => {
      const field: TallyField = { key: 'q1', label: 'Resume', type: 'FILE_UPLOAD', value: [] };
      expect(getFileUrl(field)).toBeUndefined();
    });

    it('returns undefined for non-file array (checkboxes)', () => {
      const field: TallyField = {
        key: 'q1',
        label: 'Options',
        type: 'CHECKBOXES',
        value: [{ id: 'opt-1', text: 'Option 1' }],
      };
      expect(getFileUrl(field)).toBeUndefined();
    });
  });

  describe('isCheckboxSelected', () => {
    const checkboxField: TallyField = {
      key: 'q1',
      label: 'Package Contents',
      type: 'CHECKBOXES',
      value: [
        { id: 'opt-1', text: 'Option 1' },
        { id: 'opt-3', text: 'Option 3' },
      ],
    };

    it('returns true for selected option', () => {
      expect(isCheckboxSelected(checkboxField, 'opt-1')).toBe(true);
      expect(isCheckboxSelected(checkboxField, 'opt-3')).toBe(true);
    });

    it('returns false for unselected option', () => {
      expect(isCheckboxSelected(checkboxField, 'opt-2')).toBe(false);
    });

    it('returns false for undefined field', () => {
      expect(isCheckboxSelected(undefined, 'opt-1')).toBe(false);
    });

    it('returns false for non-array value', () => {
      const textField: TallyField = { key: 'q1', label: 'Text', type: 'INPUT_TEXT', value: 'hello' };
      expect(isCheckboxSelected(textField, 'opt-1')).toBe(false);
    });
  });

  describe('extractPersonData', () => {
    const validPayload: TallyWebhookPayload = {
      eventId: 'evt-1',
      createdAt: '2024-01-01T00:00:00Z',
      data: {
        responseId: 'resp-1',
        submissionId: 'sub-1',
        respondentId: 'person-123',
        formId: 'form-1',
        formName: 'Apply for a Role',
        createdAt: '2024-01-01T00:00:00Z',
        fields: [
          { key: APPLICATION_FIELD_KEYS.email, label: 'Email', type: 'INPUT_EMAIL', value: 'john@example.com' },
          { key: APPLICATION_FIELD_KEYS.firstName, label: 'First Name', type: 'INPUT_TEXT', value: 'John' },
          { key: APPLICATION_FIELD_KEYS.lastName, label: 'Last Name', type: 'INPUT_TEXT', value: 'Doe' },
          { key: APPLICATION_FIELD_KEYS.phoneNumber, label: 'Phone', type: 'INPUT_PHONE', value: '+1-555-0100' },
          { key: APPLICATION_FIELD_KEYS.country, label: 'Country', type: 'DROPDOWN', value: 'United States' },
          { key: APPLICATION_FIELD_KEYS.portfolioLink, label: 'Portfolio', type: 'INPUT_LINK', value: 'https://johndoe.dev' },
          { key: APPLICATION_FIELD_KEYS.educationLevel, label: 'Education', type: 'DROPDOWN', value: "Bachelor's Degree" },
        ],
      },
    };

    it('extracts all person fields', () => {
      const result = extractPersonData(validPayload);

      expect(result).toEqual({
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1-555-0100',
        country: 'United States',
        portfolioLink: 'https://johndoe.dev',
        educationLevel: "Bachelor's Degree",
        tallyRespondentId: 'person-123',
      });
    });

    it('throws error for missing email', () => {
      const payloadWithoutEmail = {
        ...validPayload,
        data: {
          ...validPayload.data,
          fields: validPayload.data.fields.filter((f) => f.key !== APPLICATION_FIELD_KEYS.email),
        },
      };

      expect(() => extractPersonData(payloadWithoutEmail)).toThrow('Email is required');
    });

    it('throws error for missing first name', () => {
      const payloadWithoutFirstName = {
        ...validPayload,
        data: {
          ...validPayload.data,
          fields: validPayload.data.fields.filter((f) => f.key !== APPLICATION_FIELD_KEYS.firstName),
        },
      };

      expect(() => extractPersonData(payloadWithoutFirstName)).toThrow('First name is required');
    });

    it('throws error for missing last name', () => {
      const payloadWithoutLastName = {
        ...validPayload,
        data: {
          ...validPayload.data,
          fields: validPayload.data.fields.filter((f) => f.key !== APPLICATION_FIELD_KEYS.lastName),
        },
      };

      expect(() => extractPersonData(payloadWithoutLastName)).toThrow('Last name is required');
    });
  });

  describe('extractApplicationData', () => {
    const validPayload: TallyWebhookPayload = {
      eventId: 'evt-1',
      createdAt: '2024-01-01T00:00:00Z',
      data: {
        responseId: 'resp-1',
        submissionId: 'sub-1',
        respondentId: 'person-123',
        formId: 'form-1',
        formName: 'Apply for a Role',
        createdAt: '2024-01-01T00:00:00Z',
        fields: [
          { key: `${APPLICATION_FIELD_KEYS.position}_suffix`, label: 'Position', type: 'HIDDEN_FIELDS', value: 'Software Developer' },
          {
            key: APPLICATION_FIELD_KEYS.resumeFile,
            label: 'Resume',
            type: 'FILE_UPLOAD',
            value: [{ id: 'f1', name: 'resume.pdf', url: 'https://tally.so/files/resume.pdf', mimeType: 'application/pdf', size: 1000 }],
          },
          { key: APPLICATION_FIELD_KEYS.academicBackground, label: 'Academic', type: 'TEXTAREA', value: 'CS degree from MIT' },
          { key: APPLICATION_FIELD_KEYS.previousExperience, label: 'Experience', type: 'TEXTAREA', value: '5 years at Google' },
          { key: APPLICATION_FIELD_KEYS.videoLink, label: 'Video', type: 'INPUT_LINK', value: 'https://youtube.com/watch?v=123' },
          {
            key: APPLICATION_FIELD_KEYS.packageContents,
            label: 'Package',
            type: 'CHECKBOXES',
            value: [
              { id: PACKAGE_CHECKBOX_IDS.resume, text: 'Resume' },
              { id: PACKAGE_CHECKBOX_IDS.academicBg, text: 'Academic Background' },
            ],
          },
        ],
      },
    };

    it('extracts all application fields', () => {
      const result = extractApplicationData(validPayload, 'person-123');

      expect(result).toEqual({
        personId: 'person-123',
        position: 'Software Developer',
        resumeUrl: 'https://tally.so/files/resume.pdf',
        academicBackground: 'CS degree from MIT',
        previousExperience: '5 years at Google',
        videoLink: 'https://youtube.com/watch?v=123',
        otherFileUrl: undefined,
        hasResume: true,
        hasAcademicBg: true,
        hasVideoIntro: false,
        hasPreviousExp: false,
        hasOtherFile: false,
        tallySubmissionId: 'sub-1',
        tallyResponseId: 'resp-1',
        tallyFormId: 'form-1',
      });
    });

    it('throws error for missing position', () => {
      const payloadWithoutPosition = {
        ...validPayload,
        data: {
          ...validPayload.data,
          fields: validPayload.data.fields.filter((f) => !f.key.startsWith(APPLICATION_FIELD_KEYS.position)),
        },
      };

      expect(() => extractApplicationData(payloadWithoutPosition, 'person-123')).toThrow(
        'Position is required'
      );
    });
  });

  describe('extractGCAssessmentData', () => {
    const validPayload: TallyWebhookPayload = {
      eventId: 'evt-1',
      createdAt: '2024-01-01T00:00:00Z',
      data: {
        responseId: 'resp-1',
        submissionId: 'sub-gc-1',
        respondentId: 'resp-123',
        formId: 'form-gc',
        formName: 'General Competencies Questionnaire',
        createdAt: '2024-01-01T00:00:00Z',
        fields: [
          { key: `${GC_ASSESSMENT_FIELD_KEYS.personId}_suffix`, label: 'who', type: 'HIDDEN_FIELDS', value: 'person-123' },
          { key: `${GC_ASSESSMENT_FIELD_KEYS.score}_calc`, label: 'score', type: 'CALCULATED_FIELDS', value: 85 },
          { key: `${GC_ASSESSMENT_FIELD_KEYS.cultureScore}_calc`, label: 'cultureScore', type: 'CALCULATED_FIELDS', value: 30 },
          { key: `${GC_ASSESSMENT_FIELD_KEYS.situationalScore}_calc`, label: 'situationalScore', type: 'CALCULATED_FIELDS', value: 28 },
          { key: `${GC_ASSESSMENT_FIELD_KEYS.digitalScore}_calc`, label: 'digitalScore', type: 'CALCULATED_FIELDS', value: 27 },
        ],
      },
    };

    it('extracts GC assessment data', () => {
      const result = extractGCAssessmentData(validPayload);

      expect(result).toEqual({
        personId: 'person-123',
        score: 85,
        rawData: {
          subscores: {
            cultureScore: 30,
            situationalScore: 28,
            digitalScore: 27,
          },
          fields: validPayload.data.fields,
        },
        tallySubmissionId: 'sub-gc-1',
      });
    });

    it('throws error for missing personId', () => {
      const payloadWithoutPersonId = {
        ...validPayload,
        data: {
          ...validPayload.data,
          fields: validPayload.data.fields.filter((f) => !f.key.startsWith(GC_ASSESSMENT_FIELD_KEYS.personId)),
        },
      };

      expect(() => extractGCAssessmentData(payloadWithoutPersonId)).toThrow(
        'Person ID (who) is required'
      );
    });

    it('throws error for missing score', () => {
      const payloadWithoutScore = {
        ...validPayload,
        data: {
          ...validPayload.data,
          fields: validPayload.data.fields.filter((f) => !f.key.startsWith(GC_ASSESSMENT_FIELD_KEYS.score)),
        },
      };

      expect(() => extractGCAssessmentData(payloadWithoutScore)).toThrow('Score is required');
    });
  });

  describe('validateRequiredFields', () => {
    const payload: TallyWebhookPayload = {
      eventId: 'evt-1',
      createdAt: '2024-01-01T00:00:00Z',
      data: {
        responseId: 'resp-1',
        submissionId: 'sub-1',
        respondentId: 'person-123',
        formId: 'form-1',
        formName: 'Test',
        createdAt: '2024-01-01T00:00:00Z',
        fields: [
          { key: 'q1', label: 'Q1', type: 'INPUT_TEXT', value: 'value1' },
          { key: 'q2', label: 'Q2', type: 'INPUT_TEXT', value: '' },
          { key: 'q3', label: 'Q3', type: 'INPUT_TEXT', value: null },
        ],
      },
    };

    it('returns empty array when all required fields present', () => {
      const result = validateRequiredFields(payload, ['q1']);
      expect(result).toEqual([]);
    });

    it('returns missing field keys', () => {
      const result = validateRequiredFields(payload, ['q1', 'q2', 'q3', 'q4']);
      expect(result).toEqual(['q2', 'q3', 'q4']);
    });
  });
});
