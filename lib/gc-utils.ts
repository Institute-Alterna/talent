/**
 * GC Assessment Utilities
 *
 * Shared constants and helpers for working with General Competencies
 * assessment raw data. Used by both the application detail view and
 * the GCQ responses dialog.
 *
 * Handles both old (flat sub-scores) and new ({ subscores, fields }) format
 * for backwards compatibility with existing assessment records.
 */

// ─── Subscore Configuration ─────────────────────────────────────────

/**
 * GC sub-score keys and their display labels.
 * Single source of truth for both the inline breakdown and the full dialog.
 */
export const GC_SUBSCORE_ENTRIES = [
  { key: 'cultureScore', label: 'Culture' },
  { key: 'situationalScore', label: 'Situational' },
  { key: 'digitalScore', label: 'Digital' },
] as const;

/**
 * Map from sub-score key to display label.
 * Derived from GC_SUBSCORE_ENTRIES for lookup convenience.
 */
export const GC_SUBSCORE_LABELS: Record<string, string> = Object.fromEntries(
  GC_SUBSCORE_ENTRIES.map(({ key, label }) => [key, label])
);

// ─── Raw Data Helpers ────────────────────────────────────────────────

/**
 * Extract the sub-scores object from GC raw assessment data.
 *
 * Handles both formats:
 * - New: `{ subscores: { cultureScore, ... }, fields: [...] }`
 * - Old: `{ cultureScore, situationalScore, digitalScore }`
 *
 * @param rawData - The rawData field from a GC Assessment record
 * @returns Sub-score values keyed by score name, or null if none present
 */
export function extractGCSubscores(rawData: unknown): Record<string, number> | null {
  if (!rawData || typeof rawData !== 'object') return null;
  const data = rawData as Record<string, unknown>;
  const source = (
    typeof data.subscores === 'object' && data.subscores !== null
      ? data.subscores
      : data
  ) as Record<string, unknown>;

  const entries: [string, number][] = GC_SUBSCORE_ENTRIES
    .filter(({ key }) => typeof source[key] === 'number')
    .map(({ key }) => [key, source[key] as number]);

  return entries.length ? Object.fromEntries(entries) : null;
}

/**
 * Tally field data shape as stored in rawData.fields.
 */
export interface GCTallyFieldData {
  key: string;
  label: string;
  type: string;
  value: unknown;
  options?: Array<{ id: string; text: string }>;
}

/**
 * Extract the Tally fields array from GC raw assessment data.
 * Returns null if the data predates the fields-based format.
 *
 * @param rawData - The rawData field from a GC Assessment record
 * @returns Array of Tally field data, or null
 */
export function extractGCFields(rawData: unknown): GCTallyFieldData[] | null {
  if (!rawData || typeof rawData !== 'object') return null;
  const data = rawData as Record<string, unknown>;
  if ('fields' in data && Array.isArray(data.fields)) {
    return data.fields as GCTallyFieldData[];
  }
  return null;
}

/**
 * Check whether the raw data contains the full Tally fields array.
 *
 * @param rawData - The rawData field from a GC Assessment record
 * @returns true if the new fields-based format is present
 */
export function hasGCFields(rawData: unknown): boolean {
  if (!rawData || typeof rawData !== 'object') return false;
  const data = rawData as Record<string, unknown>;
  return 'fields' in data && Array.isArray(data.fields);
}
