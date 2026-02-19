/**
 * useMediaQuery Hook
 *
 * Returns true when a CSS media query matches.
 * Uses useSyncExternalStore for SSR-safe hydration (returns false on server).
 */

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
