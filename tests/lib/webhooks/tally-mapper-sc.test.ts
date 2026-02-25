/**
 * Tally Mapper — SC Assessment Tests
 *
 * Tests for extractSCAssessmentData and extractFileUrls.
 * Complements the existing tally-mapper.test.ts.
 */

import {
  extractSCAssessmentData,
  extractFileUrls,
  SC_ASSESSMENT_FIELD_KEYS,
  type TallyWebhookPayload,
  type TallyField,
} from '@/lib/webhooks/tally-mapper';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePayload = (fields: TallyField[], submissionId = 'sub-sc-001'): TallyWebhookPayload => ({
  eventId: 'evt-sc-001',
  createdAt: '2025-06-01T10:00:00Z',
  data: {
    responseId: 'resp-sc-001',
    submissionId,
    respondentId: 'resp-001',
    formId: 'form-sc',
    formName: 'SC Assessment',
    createdAt: '2025-06-01T10:00:00Z',
    fields,
  },
});

const baseFields: TallyField[] = [
  {
    key: `${SC_ASSESSMENT_FIELD_KEYS.applicationId}_hidden`,
    label: 'Application ID',
    type: 'HIDDEN_FIELDS',
    value: 'app-1111-2222-3333-444444444444',
  },
  {
    key: `${SC_ASSESSMENT_FIELD_KEYS.personId}_hidden`,
    label: 'Person ID',
    type: 'HIDDEN_FIELDS',
    value: 'person-aaaa-bbbb-cccc-dddddddddddd',
  },
];

// ---------------------------------------------------------------------------
// extractFileUrls
// ---------------------------------------------------------------------------

describe('extractFileUrls', () => {
  it('extracts URLs from file upload fields', () => {
    const fields: TallyField[] = [
      {
        key: 'question_upload1',
        label: 'Portfolio Document',
        type: 'FILE_UPLOAD',
        value: [
          {
            id: 'file-1',
            name: 'portfolio.pdf',
            url: 'https://tally.so/files/portfolio.pdf',
            mimeType: 'application/pdf',
            size: 20000,
          },
        ],
      },
    ];

    const result = extractFileUrls(fields);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      label: 'Portfolio Document',
      url: 'https://tally.so/files/portfolio.pdf',
      type: 'application/pdf',
    });
  });

  it('extracts files from multiple upload fields', () => {
    const fields: TallyField[] = [
      {
        key: 'question_upload1',
        label: 'Resume',
        type: 'FILE_UPLOAD',
        value: [
          {
            id: 'file-1',
            name: 'resume.pdf',
            url: 'https://tally.so/files/resume.pdf',
            mimeType: 'application/pdf',
            size: 10000,
          },
        ],
      },
      {
        key: 'question_upload2',
        label: 'Certificate',
        type: 'FILE_UPLOAD',
        value: [
          {
            id: 'file-2',
            name: 'cert.png',
            url: 'https://tally.so/files/cert.png',
            mimeType: 'image/png',
            size: 5000,
          },
        ],
      },
    ];

    const result = extractFileUrls(fields);

    expect(result).toHaveLength(2);
    expect(result[0].url).toContain('resume.pdf');
    expect(result[1].url).toContain('cert.png');
  });

  it('skips non-file fields (text, numbers)', () => {
    const fields: TallyField[] = [
      { key: 'question_text', label: 'Name', type: 'INPUT_TEXT', value: 'John Doe' },
      { key: 'question_number', label: 'Score', type: 'INPUT_NUMBER', value: 85 },
      { key: 'question_empty', label: 'Empty', type: 'FILE_UPLOAD', value: [] },
    ];

    expect(extractFileUrls(fields)).toHaveLength(0);
  });

  it('skips checkbox arrays (not file uploads)', () => {
    const fields: TallyField[] = [
      {
        key: 'question_checkboxes',
        label: 'Options',
        type: 'CHECKBOXES',
        value: [{ id: 'opt-1', text: 'Option 1' }],
      },
    ];

    expect(extractFileUrls(fields)).toHaveLength(0);
  });

  it('returns empty array for empty fields list', () => {
    expect(extractFileUrls([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractSCAssessmentData
// ---------------------------------------------------------------------------

describe('extractSCAssessmentData', () => {
  it('returns undefined applicationId when the hidden field is absent', () => {
    // Real SC forms (SCA | Design, etc.) do not embed a hidden application-ID
    // field; the route handler resolves it via respondentId instead.
    const fields = baseFields.filter(
      (f) => !f.key.startsWith(SC_ASSESSMENT_FIELD_KEYS.applicationId)
    );
    const result = extractSCAssessmentData(makePayload(fields));
    expect(result.applicationId).toBeUndefined();
  });

  it('extracts applicationId and personId when hidden fields are present', () => {
    const result = extractSCAssessmentData(makePayload(baseFields));
    expect(result.applicationId).toBe('app-1111-2222-3333-444444444444');
    expect(result.personId).toBe('person-aaaa-bbbb-cccc-dddddddddddd');
  });

  it('score is undefined when score field is absent', () => {
    const result = extractSCAssessmentData(makePayload(baseFields));
    expect(result.score).toBeUndefined();
  });

  it('extracts optional score when present', () => {
    const fields: TallyField[] = [
      ...baseFields,
      {
        key: `${SC_ASSESSMENT_FIELD_KEYS.score}_calc`,
        label: 'Total Score',
        type: 'CALCULATED',
        value: 75,
      },
    ];
    const result = extractSCAssessmentData(makePayload(fields));
    expect(result.score).toBe(75);
  });

  it('extracts specialisedCompetencyId from scId hidden field', () => {
    const scUuid = 'sc-uuid-1111-2222-3333-444444444444';
    const fields: TallyField[] = [
      ...baseFields,
      {
        key: `${SC_ASSESSMENT_FIELD_KEYS.specialisedCompetencyId}_hidden`,
        label: 'SC ID',
        type: 'HIDDEN_FIELDS',
        value: scUuid,
      },
    ];
    const result = extractSCAssessmentData(makePayload(fields));
    expect(result.specialisedCompetencyId).toBe(scUuid);
  });

  it('specialisedCompetencyId is undefined when scId field is absent', () => {
    const result = extractSCAssessmentData(makePayload(baseFields));
    expect(result.specialisedCompetencyId).toBeUndefined();
  });

  it('extracts file submission URLs', () => {
    const fields: TallyField[] = [
      ...baseFields,
      {
        key: 'question_portfolio',
        label: 'Portfolio',
        type: 'FILE_UPLOAD',
        value: [
          {
            id: 'file-1',
            name: 'portfolio.pdf',
            url: 'https://tally.so/files/portfolio.pdf',
            mimeType: 'application/pdf',
            size: 15000,
          },
        ],
      },
    ];
    const result = extractSCAssessmentData(makePayload(fields));
    expect(result.submissionUrls).toHaveLength(1);
    expect(result.submissionUrls[0].url).toBe('https://tally.so/files/portfolio.pdf');
    expect(result.submissionUrls[0].label).toBe('Portfolio');
  });

  it('returns empty submissionUrls when no files uploaded', () => {
    const result = extractSCAssessmentData(makePayload(baseFields));
    expect(result.submissionUrls).toEqual([]);
  });

  it('includes tallySubmissionId', () => {
    const result = extractSCAssessmentData(makePayload(baseFields, 'sub-unique-999'));
    expect(result.tallySubmissionId).toBe('sub-unique-999');
  });

  it('includes rawData with fields array', () => {
    const result = extractSCAssessmentData(makePayload(baseFields));
    expect(result.rawData).toHaveProperty('fields');
    expect((result.rawData as { fields: TallyField[] }).fields).toEqual(baseFields);
  });

  it('handles full payload with all optional fields populated', () => {
    const scUuid = 'sc-uuid-aaaa-bbbb-cccc-dddddddddddd';
    const fields: TallyField[] = [
      ...baseFields,
      {
        key: `${SC_ASSESSMENT_FIELD_KEYS.score}_calc`,
        label: 'Total',
        type: 'CALCULATED',
        value: 90,
      },
      {
        key: `${SC_ASSESSMENT_FIELD_KEYS.specialisedCompetencyId}_hidden`,
        label: 'SC Definition',
        type: 'HIDDEN_FIELDS',
        value: scUuid,
      },
      {
        key: 'question_work_sample',
        label: 'Work Sample',
        type: 'FILE_UPLOAD',
        value: [
          {
            id: 'file-ws',
            name: 'work-sample.zip',
            url: 'https://tally.so/files/work-sample.zip',
            mimeType: 'application/zip',
            size: 100000,
          },
        ],
      },
    ];

    const result = extractSCAssessmentData(makePayload(fields, 'sub-full'));

    expect(result.applicationId).toBe('app-1111-2222-3333-444444444444');
    expect(result.personId).toBe('person-aaaa-bbbb-cccc-dddddddddddd');
    expect(result.specialisedCompetencyId).toBe(scUuid);
    expect(result.score).toBe(90);
    expect(result.submissionUrls).toHaveLength(1);
    expect(result.tallySubmissionId).toBe('sub-full');
  });
});
