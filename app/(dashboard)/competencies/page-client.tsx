'use client';

/**
 * Competencies Page Client Component
 *
 * Displays specialised competency definitions in a filterable table/card list.
 * Admins can create, edit, deactivate, and reactivate competencies via dialogs.
 * Uses the same list-view style as the candidates "accepted" filter view.
 */

import * as React from 'react';
import { strings, recruitment } from '@/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks';
import { Plus, Pencil, Trash2, Power, ExternalLink, RotateCcw, RefreshCw } from 'lucide-react';
import type { SpecialisedCompetency } from '@/types';

type StatusFilter = 'active' | 'inactive';

type ConfirmAction = 'deactivate' | 'reactivate' | 'hardDelete';

interface CompetenciesPageClientProps {
  isAdmin: boolean;
}

/** Mobile card for a competency row */
function CompetencyMobileCard({
  sc,
  isAdmin,
  onEdit,
  onAction,
}: {
  sc: SpecialisedCompetency;
  isAdmin: boolean;
  onEdit: (sc: SpecialisedCompetency) => void;
  onAction: (sc: SpecialisedCompetency, action: ConfirmAction) => void;
}) {
  return (
    <div className={`rounded-lg border bg-card p-3 ${!sc.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{sc.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {sc.criterion}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {sc.category}
          </Badge>
          {!sc.isActive && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {strings.competencies.inactive}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <a
          href={sc.tallyFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          Tally Form
        </a>
        {isAdmin && (
          <div className="flex items-center gap-1">
            {sc.isActive ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(sc)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title="Deactivate (Shift+click to permanently delete)"
                  onClick={(e) => e.shiftKey ? onAction(sc, 'hardDelete') : onAction(sc, 'deactivate')}
                >
                  <Power className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary hover:text-primary"
                  title="Reactivate"
                  onClick={() => onAction(sc, 'reactivate')}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title="Permanently delete"
                  onClick={() => onAction(sc, 'hardDelete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CompetenciesPageClient({ isAdmin }: CompetenciesPageClientProps) {
  const [competencies, setCompetencies] = React.useState<SpecialisedCompetency[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('active');
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingCompetency, setEditingCompetency] =
    React.useState<SpecialisedCompetency | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction | null>(null);
  const [confirmTarget, setConfirmTarget] = React.useState<SpecialisedCompetency | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  // Form state
  const [formName, setFormName] = React.useState('');
  const [formCategory, setFormCategory] = React.useState('');
  const [formUrl, setFormUrl] = React.useState('');
  const [formCriterion, setFormCriterion] = React.useState('');

  const categories = ['all', ...recruitment.scCategories];

  // Filter by status (active/inactive), then by category
  const filteredCompetencies = React.useMemo(() => {
    let filtered = competencies;

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((c) => c.isActive);
    } else {
      filtered = filtered.filter((c) => !c.isActive);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((c) => c.category === selectedCategory);
    }

    return filtered;
  }, [competencies, statusFilter, selectedCategory]);

  // Counts for filter pills
  const { activeCount, inactiveCount } = React.useMemo(() => ({
    activeCount: competencies.filter((c) => c.isActive).length,
    inactiveCount: competencies.filter((c) => !c.isActive).length,
  }), [competencies]);

  // Fetch competencies from API
  const fetchCompetencies = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/competencies');
      if (res.ok) {
        const data = await res.json();
        setCompetencies(data.competencies);
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchCompetencies();
  }, [fetchCompetencies]);

  // Open add dialog
  const openAddDialog = () => {
    setEditingCompetency(null);
    setFormName('');
    setFormCategory('');
    setFormUrl('');
    setFormCriterion('');
    setEditDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (competency: SpecialisedCompetency) => {
    setEditingCompetency(competency);
    setFormName(competency.name);
    setFormCategory(competency.category);
    setFormUrl(competency.tallyFormUrl);
    setFormCriterion(competency.criterion);
    setEditDialogOpen(true);
  };

  // Confirmation dialog configuration — maps action type to API call and UI strings
  const confirmConfig: Record<ConfirmAction, {
    title: string;
    description: string;
    confirmLabel: string;
    pendingLabel: string;
    destructive: boolean;
    fetch: (sc: SpecialisedCompetency) => Promise<Response>;
    successMessage: string;
  }> = {
    deactivate: {
      title: strings.competencies.deleteConfirmTitle,
      description: strings.competencies.deleteConfirmDescription,
      confirmLabel: 'Deactivate',
      pendingLabel: 'Deactivating...',
      destructive: true,
      fetch: (sc) => fetch(`/api/competencies/${sc.id}`, { method: 'DELETE' }),
      successMessage: 'Competency deactivated',
    },
    reactivate: {
      title: strings.competencies.reactivateConfirmTitle,
      description: strings.competencies.reactivateConfirmDescription,
      confirmLabel: 'Reactivate',
      pendingLabel: 'Reactivating...',
      destructive: false,
      fetch: (sc) => fetch(`/api/competencies/${sc.id}`, { method: 'PATCH' }),
      successMessage: strings.competencies.reactivateCompetency,
    },
    hardDelete: {
      title: strings.competencies.hardDeleteConfirmTitle,
      description: strings.competencies.hardDeleteConfirmDescription,
      confirmLabel: 'Permanently Delete',
      pendingLabel: 'Deleting...',
      destructive: true,
      fetch: (sc) => fetch(`/api/competencies/${sc.id}?force=true`, { method: 'DELETE' }),
      successMessage: strings.competencies.hardDeleteCompetency,
    },
  };

  const openConfirmDialog = (sc: SpecialisedCompetency, action: ConfirmAction) => {
    setConfirmTarget(sc);
    setConfirmAction(action);
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget || !confirmAction) return;
    const config = confirmConfig[confirmAction];
    setIsSubmitting(true);
    try {
      const res = await config.fetch(confirmTarget);
      if (!res.ok) {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || `Failed to ${confirmAction}`,
          variant: 'destructive',
        });
        return;
      }
      toast({ title: config.successMessage });
      setConfirmAction(null);
      setConfirmTarget(null);
      await fetchCompetencies();
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save (create or update)
  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: formName,
        category: formCategory,
        tallyFormUrl: formUrl,
        criterion: formCriterion,
      };

      const res = editingCompetency
        ? await fetch(`/api/competencies/${editingCompetency.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/competencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to save',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: editingCompetency ? 'Competency updated' : 'Competency created',
      });
      setEditDialogOpen(false);
      await fetchCompetencies();
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    formName.trim() && formCategory && formUrl.trim() && formCriterion.trim();

  const noResultsMessage =
    statusFilter === 'inactive'
      ? strings.competencies.noCompetenciesInactive
      : strings.competencies.noCompetencies;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-9 w-20 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: status filter + category pills + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter pills */}
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              statusFilter === 'active'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {strings.competencies.filterActive} ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              statusFilter === 'inactive'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {strings.competencies.filterInactive} ({inactiveCount})
          </button>

          {/* Divider */}
          <div className="hidden sm:block h-5 w-px bg-border" />

          {/* Category pills */}
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchCompetencies}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <Button onClick={openAddDialog} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              {strings.competencies.addNew}
            </Button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filteredCompetencies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>{noResultsMessage}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{strings.competencies.name}</TableHead>
                  <TableHead className="w-[120px]">{strings.competencies.category}</TableHead>
                  <TableHead>{strings.competencies.criterion}</TableHead>
                  <TableHead className="w-[100px]">Form</TableHead>
                  {isAdmin && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompetencies.map((sc) => (
                  <TableRow key={sc.id} className={!sc.isActive ? 'opacity-60' : undefined}>
                    <TableCell className="font-medium">{sc.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {sc.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-sm truncate">
                      {sc.criterion}
                    </TableCell>
                    <TableCell>
                      <a
                        href={sc.tallyFormUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </a>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {sc.isActive ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(sc)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="Deactivate (Shift+click to permanently delete)"
                              onClick={(e) => e.shiftKey ? openConfirmDialog(sc, 'hardDelete') : openConfirmDialog(sc, 'deactivate')}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:text-primary"
                              title="Reactivate"
                              onClick={() => openConfirmDialog(sc, 'reactivate')}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="Permanently delete"
                              onClick={() => openConfirmDialog(sc, 'hardDelete')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filteredCompetencies.map((sc) => (
              <CompetencyMobileCard
                key={sc.id}
                sc={sc}
                isAdmin={isAdmin}
                onEdit={openEditDialog}
                onAction={openConfirmDialog}
              />
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCompetency
                ? strings.competencies.editCompetency
                : strings.competencies.addNew}
            </DialogTitle>
            <DialogDescription>
              {editingCompetency
                ? 'Update the competency details below.'
                : 'Define a new specialised competency assessment.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sc-name">{strings.competencies.name}</Label>
              <Input
                id="sc-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={200}
                placeholder="e.g. Code Review"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-category">{strings.competencies.category}</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger id="sc-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {recruitment.scCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-url">{strings.competencies.tallyFormUrl}</Label>
              <Input
                id="sc-url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                type="url"
                placeholder="https://tally.so/r/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-criterion">{strings.competencies.criterion}</Label>
              <Textarea
                id="sc-criterion"
                value={formCriterion}
                onChange={(e) => setFormCriterion(e.target.value)}
                maxLength={2000}
                placeholder={strings.competencies.criterionPlaceholder}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Data-driven confirmation dialog */}
      {confirmAction && (() => {
        const c = confirmConfig[confirmAction];
        return (
          <AlertDialog open={true} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setConfirmTarget(null); } }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{c.title}</AlertDialogTitle>
                <AlertDialogDescription>{c.description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmAction}
                  disabled={isSubmitting}
                  className={c.destructive ? 'bg-destructive text-white hover:bg-destructive/85' : undefined}
                >
                  {isSubmitting ? c.pendingLabel : c.confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}
    </div>
  );
}
