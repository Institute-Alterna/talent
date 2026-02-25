'use client';

/**
 * ToastContainer Component
 *
 * Renders visual toast notifications from the useToast context.
 * Fixed position bottom-right, max 3 visible toasts with animations.
 */

import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  // Show at most 3 toasts
  const visible = toasts.slice(-3);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
      {visible.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'animate-in slide-in-from-bottom-2 fade-in rounded-lg border shadow-lg p-4 pr-8 relative',
            'bg-background text-foreground',
            toast.variant === 'destructive' &&
              'border-destructive/50 bg-destructive/10 text-destructive'
          )}
        >
          {toast.title && (
            <p
              className={cn(
                'text-sm font-semibold',
                toast.variant === 'destructive' && 'text-destructive'
              )}
            >
              {toast.title}
            </p>
          )}
          {toast.description && (
            <p
              className={cn(
                'text-sm text-muted-foreground mt-1',
                toast.variant === 'destructive' && 'text-destructive/90'
              )}
            >
              {toast.description}
            </p>
          )}
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className={cn(
              'absolute top-3 right-3 rounded-sm opacity-70 transition-opacity hover:opacity-100',
              'text-foreground/50 hover:text-foreground',
              toast.variant === 'destructive' &&
                'text-destructive/70 hover:text-destructive'
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
