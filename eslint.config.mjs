import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

/**
 * ESLint Configuration
 *
 * Uses the new flat config format (ESLint 9+).
 * - Next.js recommended rules (core-web-vitals)
 * - TypeScript support
 * - Prettier integration (disables formatting rules that conflict)
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Rule: discourage using Date.prototype.toLocaleDateString/toLocaleString directly
  {
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.property.name='toLocaleDateString']",
          message: 'Use shared date helpers from "@/lib/utils" instead of "toLocaleDateString" for consistent formatting.'
        },
        {
          selector: "CallExpression[callee.property.name='toLocaleString']",
          message: 'Use shared date helpers from "@/lib/utils" instead of "toLocaleString" for consistent formatting.'
        }
      ]
    }
  },
  // Allowlist: disable the restriction inside our intentional helper modules
  {
    files: ['lib/utils.ts', 'lib/pdf/sanitize.ts', 'lib/email/templates.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  // Prettier config - must be last to override other formatting rules
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Additional ignores
    'node_modules/**',
    'coverage/**',
  ]),
]);

export default eslintConfig;
