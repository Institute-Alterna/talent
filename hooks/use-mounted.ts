/**
 * useMounted Hook
 *
 * Returns true once the component has mounted on the client.
 * Uses useSyncExternalStore for SSR-safe hydration — returns false
 * during server rendering and on the first client render, then true
 * after hydration completes.
 *
 * Use this to defer rendering of client-only UI (e.g. Radix primitives
 * that rely on useId()) and avoid hydration mismatches.
 */

import { useSyncExternalStore } from 'react';

/** No-op subscribe — the value never changes after mount */
const subscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
