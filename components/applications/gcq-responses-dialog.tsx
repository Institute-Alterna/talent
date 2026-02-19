'use client';

/**
 * GC Responses Dialog
 *
 * Lazy-rendered, responsive dialog/sheet that displays the full General
 * Competencies questionnaire response data from the Tally webhook payload.
 *
 * - Desktop (lg+): centered Dialog with ScrollArea
 * - Mobile: bottom Sheet (full-height, native scroll)
 * - No additional DB call — reads from already-fetched rawData
 * - Content only mounts when open (lazy rendering)
 * - Dynamically maps the Tally fields array
 * - Handles both old (flat sub-scores) and new ({ subscores, fields }) format
 * - Tally field types: HIDDEN_FIELDS, CALCULATED_FIELDS,
 *   MULTIPLE_CHOICE, LINEAR_SCALE, INPUT_TEXT, INPUT_NUMBER, FILE_UPLOAD
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useMediaQuery } from '@/hooks';
import {
  GC_SUBSCORE_LABELS,
  extractGCSubscores,
  extractGCFields,
  type GCTallyFieldData,
} from '@/lib/gc-utils';

// ─── Constants ───────────────────────────────────────────────────────

/** Field types hidden from the viewer (internal plumbing like personId). */
const HIDDEN_FIELD_TYPES = new Set(['HIDDEN_FIELDS']);

/**
 * Field types representing calculated scores — rendered as section headers.
 * Tally uses "CALCULATED_FIELDS" (plural); support both for safety.
 */
const CALCULATED_FIELD_TYPES = new Set(['CALCULATED_FIELDS', 'CALCULATED']);

const TITLE = 'GC Responses';

// ─── Types ───────────────────────────────────────────────────────────

interface GCQResponsesDialogProps {
  rawData: unknown;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Resolve selected IDs from a MULTIPLE_CHOICE value.
 * Handles both formats: array of string IDs and array of { id, text } objects.
 */
function resolveSelectedIds(value: unknown[]): Set<string> {
  return new Set(
    value.map((v) => {
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v !== null && 'id' in v)
        return (v as { id: string }).id;
      return String(v);
    }),
  );
}

// ─── Subscore Summary ───────────────────────────────────────────────

/** Summary card row shown at the top of the dialog for quick orientation. */
function SubscoreSummary({ rawData }: { rawData: unknown }) {
  const subscores = extractGCSubscores(rawData);
  if (!subscores) return null;

  const entries = Object.entries(GC_SUBSCORE_LABELS).filter(
    ([key]) => subscores[key] !== undefined,
  );
  if (!entries.length) return null;

  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 mb-1">
      {entries.map(([key, label]) => (
        <div key={key} className="flex flex-col items-center gap-0.5">
          <span className="text-base font-bold tabular-nums">
            {subscores[key]}
          </span>
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Field Renderers ─────────────────────────────────────────────────

/** Render a single field value based on its Tally type. */
function FieldValue({ field }: { field: GCTallyFieldData }) {
  const { type, value, options } = field;

  // Null / empty
  if (value === null || value === undefined || value === '') {
    return (
      <span className="text-muted-foreground italic text-xs">No answer</span>
    );
  }

  // LINEAR_SCALE — numeric value on a scale (e.g. 1-5)
  if (type === 'LINEAR_SCALE' && typeof value === 'number') {
    return <span className="text-sm font-medium">{value}</span>;
  }

  // MULTIPLE_CHOICE / CHECKBOXES — array of selected option IDs
  if (
    (type === 'MULTIPLE_CHOICE' || type === 'CHECKBOXES') &&
    Array.isArray(value) &&
    options?.length
  ) {
    const selectedIds = resolveSelectedIds(value);

    return (
      <div className="space-y-1">
        {options.map((opt) => {
          const isSelected = selectedIds.has(opt.id);
          return (
            <div key={opt.id} className="flex items-start gap-1.5">
              <div
                className={`mt-0.5 h-3 w-3 rounded-sm border flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/30'
                }`}
              >
                {isSelected && (
                  <svg className="h-2 w-2" viewBox="0 0 8 8" fill="none">
                    <path
                      d="M1 4L3 6L7 2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span
                className={`text-xs leading-snug ${
                  isSelected ? 'font-medium' : 'text-muted-foreground'
                }`}
              >
                {opt.text}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Boolean
  if (typeof value === 'boolean') {
    return <span className="text-sm">{value ? 'Yes' : 'No'}</span>;
  }

  // Number
  if (typeof value === 'number') {
    return <span className="text-sm font-medium">{value}</span>;
  }

  // String
  if (typeof value === 'string') {
    return <span className="text-sm break-words">{value}</span>;
  }

  // Array — file uploads or generic
  if (Array.isArray(value)) {
    // File uploads (objects with url + name)
    if (
      value.length > 0 &&
      typeof value[0] === 'object' &&
      value[0] !== null &&
      'url' in value[0]
    ) {
      return (
        <div className="space-y-1">
          {value.map(
            (file: { id?: string; name: string; url: string }, i: number) => (
              <a
                key={file.id ?? i}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline block truncate"
              >
                {file.name}
              </a>
            ),
          )}
        </div>
      );
    }

    // Generic array with text objects
    if (
      value.length > 0 &&
      typeof value[0] === 'object' &&
      value[0] !== null &&
      'text' in value[0]
    ) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((v: { id?: string; text: string }, i: number) => (
            <Badge key={v.id ?? i} variant="secondary" className="text-xs">
              {v.text}
            </Badge>
          ))}
        </div>
      );
    }

    return <span className="text-sm">{value.map(String).join(', ')}</span>;
  }

  // Fallback
  return <span className="text-sm">{String(value)}</span>;
}

// ─── Response List ───────────────────────────────────────────────────

/** Shared content rendered inside both Dialog and Sheet. */
function ResponseList({ fields }: { fields: GCTallyFieldData[] | null }) {
  if (!fields) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          No questionnaire data available for this assessment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {fields
        .filter(
          (field) =>
            !HIDDEN_FIELD_TYPES.has(field.type) &&
            !CALCULATED_FIELD_TYPES.has(field.type),
        )
        .map((field) => (
          <div key={field.key} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground leading-snug">
              {field.label}
            </p>
            <FieldValue field={field} />
          </div>
        ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function GCQResponsesDialog({
  rawData,
  open,
  onOpenChange,
  candidateName,
}: GCQResponsesDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const fields = open ? extractGCFields(rawData) : null;

  // Desktop: centered Dialog with scrollable content area
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {open && (
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden p-0">
            <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
              <DialogTitle>{TITLE}</DialogTitle>
              {candidateName && (
                <DialogDescription>{candidateName}</DialogDescription>
              )}
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-1">
              <SubscoreSummary rawData={rawData} />
              <ResponseList fields={fields} />
            </div>
          </DialogContent>
        )}
      </Dialog>
    );
  }

  // Mobile: bottom Sheet (full-height, native scroll)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl flex flex-col p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
          <SheetTitle className="text-left">{TITLE}</SheetTitle>
          {candidateName && (
            <SheetDescription className="text-left">{candidateName}</SheetDescription>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-auto px-4 pt-3">
          <SubscoreSummary rawData={rawData} />
          <ResponseList fields={fields} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
