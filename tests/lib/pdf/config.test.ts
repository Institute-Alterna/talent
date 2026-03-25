/**
 * Tests for PDF font registration config.
 *
 * Focuses on regression coverage for missing italic face registration,
 * which previously caused runtime PDF generation failures.
 */

describe('lib/pdf/config ensurePdfFontsRegistered', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('registers DMSans with 400 italic face', async () => {
    const register = jest.fn();

    jest.doMock('@react-pdf/renderer', () => ({
      Font: {
        register,
      },
    }));

    const { ensurePdfFontsRegistered } = (await import('@/lib/pdf/config')) as {
      ensurePdfFontsRegistered: () => void;
    };

    ensurePdfFontsRegistered();

    expect(register).toHaveBeenCalledTimes(1);
    const payload = register.mock.calls[0][0] as {
      family: string;
      fonts: Array<{ src: string; fontWeight: number; fontStyle?: string }>;
    };

    expect(payload.family).toBe('DMSans');
    expect(payload.fonts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontWeight: 400,
          fontStyle: 'italic',
        }),
      ])
    );
  });

  it('is idempotent and registers only once per module instance', async () => {
    const register = jest.fn();

    jest.doMock('@react-pdf/renderer', () => ({
      Font: {
        register,
      },
    }));

    const { ensurePdfFontsRegistered } = (await import('@/lib/pdf/config')) as {
      ensurePdfFontsRegistered: () => void;
    };

    ensurePdfFontsRegistered();
    ensurePdfFontsRegistered();

    expect(register).toHaveBeenCalledTimes(1);
  });
});
