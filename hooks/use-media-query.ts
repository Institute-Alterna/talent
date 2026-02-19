/**
 * useMediaQuery Hook
 *
 * Returns true when a CSS media query matches.
 * Uses useSyncExternalStore for SSR-safe hydration (returns false on server).
 */

import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
