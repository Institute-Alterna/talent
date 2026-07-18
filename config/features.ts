/**
 * Feature Flags
 *
 * Environment-driven toggles for operational behaviour.
 * Prefer NEXT_PUBLIC_* when the client UI must react to the flag.
 */

/**
 * Truthy values: "true", "1", "yes", "on" (case-insensitive).
 * Everything else (including unset) is false.
 */
export function parseEnvFlag(value: string | undefined | null): boolean {
  if (!value) return false;
  const normalised = value.trim().toLowerCase();
  return normalised === 'true' || normalised === '1' || normalised === 'yes' || normalised === 'on';
}

/**
 * When enabled, applications may progress through specialised competencies,
 * interview, and hiring decisions even if general competencies are incomplete
 * or completed-but-failed.
 */
export function isPriorityProcessingEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_PRIORITY_PROCESSING_ENABLED);
}
