'use client';

/**
 * SC Explorer Dialog
 *
 * Allows administrators to select 1-3 specialised competency assessments
 * to send to a candidate. Shows competencies grouped by category with
 * filter pills, selection state, and already-assigned indicators.
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InlineError } from '@/components/shared/inline-error';
import { useDialogSubmit } from '@/hooks';
import { strings, recruitment } from '@/config';
import { CheckCircle, AlertTriangle, Loader2, Mail } from 'lucide-react';
import type { SpecialisedCompetencyOption } from '@/types';

interface SCExplorerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (competencyIds: string[]) => Promise<void>;
  isProcessing?: boolean;
  alreadyAssignedIds: string[];
}

export function SCExplorerDialog({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
  alreadyAssignedIds,
}: SCExplorerDialogProps) {
  const [competencies, setCompetencies] = React.useState<SpecialisedCompetencyOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const categories = React.useMemo(
    () => ['all', ...recruitment.scCategories] as const,
    [],
  );

  // Fetch competencies on open
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
      setSelectedCategory('all');
      return;
    }

    setIsLoading(true);
    fetch('/api/competencies')
      .then(res => res.json())
      .then(data => setCompetencies(data.competencies || []))
      .catch(() => { /* swallow — InlineError will show on submit if needed */ })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const filteredCompetencies = selectedCategory === 'all'
    ? competencies
    : competencies.filter(c => c.category === selectedCategory);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev; // Max 3
      return [...prev, id];
    });
  };

  const { isSubmitting, isDisabled, error, handleOpenChange, handleConfirm } = useDialogSubmit({
    onConfirm: async () => {
      if (selectedIds.length === 0) throw new Error('Select at least one competency');
      await onConfirm(selectedIds);
    },
    onClose,
    isProcessing,
    validate: () => {
      if (selectedIds.length === 0) return 'Select at least one competency';
      return null;
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{strings.competencies.selectCompetencies}</DialogTitle>
          <DialogDescription>{strings.competencies.selectCompetenciesDescription}</DialogDescription>
        </DialogHeader>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* SC grid */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filteredCompetencies.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{strings.competencies.noCompetencies}</p>
          ) : (
            filteredCompetencies.map((sc) => {
              const isAlreadyAssigned = alreadyAssignedIds.includes(sc.id);
              const isSelected = selectedIds.includes(sc.id);
              const isAtMax = selectedIds.length >= 3 && !isSelected;

              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => !isAlreadyAssigned && !isAtMax && toggleSelection(sc.id)}
                  disabled={isAlreadyAssigned || isAtMax}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isAlreadyAssigned
                      ? 'opacity-50 cursor-not-allowed border-muted'
                      : isSelected
                        ? 'border-primary bg-primary/5'
                        : isAtMax
                          ? 'opacity-50 cursor-not-allowed border-muted'
                          : 'border-border hover:border-primary/50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sc.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{sc.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sc.criterion}</p>
                    </div>
                    <div className="shrink-0">
                      {isAlreadyAssigned ? (
                        <Badge variant="secondary" className="text-xs">Assigned</Badge>
                      ) : isSelected ? (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Warnings */}
        {selectedIds.length > 1 && selectedIds.length <= 3 && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{strings.competencies.multipleWarning}</span>
          </div>
        )}
        {selectedIds.length >= 3 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{strings.competencies.maxReached}</span>
          </div>
        )}

        <InlineError message={error} />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDisabled}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isDisabled || selectedIds.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-3 w-3 mr-1" />
                {`Send${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
