/**
 * useToast Hook
 *
 * Simple toast notification system using React state.
 * Provides toast() function to show notifications.
 */

'use client';

import * as React from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastState {
  toasts: Toast[];
}

type ToastAction =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'REMOVE_TOAST'; id: string }
  | { type: 'CLEAR_TOASTS' };

const TOAST_TIMEOUT = 5000;

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const ToastContext = React.createContext<{
  toasts: Toast[];
  toast: (options: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
} | null>(null);

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    case 'CLEAR_TOASTS':
      return {
        ...state,
        toasts: [],
      };
    default:
      return state;
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(toastReducer, { toasts: [] });

  const toast = React.useCallback((options: Omit<Toast, 'id'>) => {
    const id = generateId();
    dispatch({ type: 'ADD_TOAST', toast: { ...options, id } });

    // Auto-dismiss after timeout
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', id });
    }, TOAST_TIMEOUT);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', id });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts: state.toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

// Stable fallback functions for when ToastProvider is not present
// These are defined at module level to ensure referential stability
const EMPTY_TOASTS: Toast[] = [];

function fallbackToast(options: Omit<Toast, 'id'>): void {
  if (options.variant === 'destructive') {
    console.error(`[Toast] ${options.title}: ${options.description}`);
  } else {
    console.log(`[Toast] ${options.title}: ${options.description}`);
  }
}

function fallbackDismiss(): void {
  // No-op when no provider
}

// Stable fallback object
const FALLBACK_CONTEXT = {
  toasts: EMPTY_TOASTS,
  toast: fallbackToast,
  dismiss: fallbackDismiss,
} as const;

export function useToast() {
  const context = React.useContext(ToastContext);

  // If context is not available, provide a stable fallback that logs to console
  if (!context) {
    return FALLBACK_CONTEXT;
  }

  return context;
}
