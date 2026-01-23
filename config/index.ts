/**
 * Configuration Index
 *
 * Re-exports all configuration modules for convenient importing.
 * Usage: import { branding, strings, recruitment } from '@/config';
 */

export { branding } from './branding';
export { strings } from './strings';
export { recruitment, formatScoreDisplay } from './recruitment';

export type { Branding } from './branding';
export type { Strings } from './strings';
export type { Recruitment, Stage, Position } from './recruitment';
