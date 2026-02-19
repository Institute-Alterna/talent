'use client';

/**
 * Candidates Page Client Component
 *
 * Displays the recruitment pipeline with application cards organized by stage.
 * Supports filtering, searching, and viewing application details.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  PipelineBoard,
  PipelineBoardData,
  type ApplicationDetailData,
  ApplicationCardData,
} from '@/components/applications';
import { Stage, Status } from '@/lib/generated/prisma/client';
import { Search, RefreshCw, Maximize2, Minimize2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks';
import { cn } from '@/lib/utils';

// Lazy-load heavy dialog components — only needed on user interaction
const ApplicationDetail = React.lazy(() => import('@/components/applications/application-detail').then(m => ({ default: m.ApplicationDetail })));
const ScheduleInterviewDialog = React.lazy(() => import('@/components/applications/schedule-interview-dialog').then(m => ({ default: m.ScheduleInterviewDialog })));
const RescheduleInterviewDialog = React.lazy(() => import('@/components/applications/reschedule-interview-dialog').then(m => ({ default: m.RescheduleInterviewDialog })));
const CompleteInterviewDialog = React.lazy(() => import('@/components/applications/complete-interview-dialog').then(m => ({ default: m.CompleteInterviewDialog })));
const WithdrawDialog = React.lazy(() => import('@/components/applications/withdraw-dialog').then(m => ({ default: m.WithdrawDialog })));
const DecisionDialog = React.lazy(() => import('@/components/applications/decision-dialog').then(m => ({ default: m.DecisionDialog })));

interface CandidatesPageClientProps {
  isAdmin: boolean;
}

interface PipelineResponse {
  applicationsByStage: PipelineBoardData;
  stats: {
    total: number;
    active: number;
    byStage: Record<Stage, number>;
    byStatus: Record<Status, number>;
    byPosition: Record<string, number>;
    awaitingAction: number;
    recentActivity: number;
  };
}

interface ApplicationDetailResponse {
  application: ApplicationDetailData;
  missingFields: string[];
}

interface AuditLogResponse {
  auditLogs: Array<{
    id: string;
    action: string;
    actionType: string;
    createdAt: string;
    user?: { displayName: string } | null;
  }>;
}

export function CandidatesPageClient({ isAdmin }: CandidatesPageClientProps) {
  const { toast } = useToast();

  // State
  const [pipelineData, setPipelineData] = React.useState<PipelineBoardData | null>(null);
  const [stats, setStats] = React.useState<PipelineResponse['stats'] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ACTIVE');
  const [positionFilter, setPositionFilter] = React.useState<string>('all');
  const [needsAttentionFilter, setNeedsAttentionFilter] = React.useState(false);
  const [showAttentionBreakdown, setShowAttentionBreakdown] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Detail modal
  const [selectedApplicationId, setSelectedApplicationId] = React.useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = React.useState<ApplicationDetailData | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditLogResponse['auditLogs'] | undefined>(undefined);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);

  // PDF export
  const [exportingPdfId, setExportingPdfId] = React.useState<string | null>(null);

  // Withdraw dialog
  const [withdrawApplicationId, setWithdrawApplicationId] = React.useState<string | null>(null);
  const [withdrawApplicationName, setWithdrawApplicationName] = React.useState<string>('');
  const [isWithdrawProcessing, setIsWithdrawProcessing] = React.useState(false);

  // Decision dialog
  const [isDecisionDialogOpen, setIsDecisionDialogOpen] = React.useState(false);
  const [decisionType, setDecisionType] = React.useState<'ACCEPT' | 'REJECT'>('REJECT');
  const [decisionApplicationName, setDecisionApplicationName] = React.useState('');
  const [isDecisionProcessing, setIsDecisionProcessing] = React.useState(false);

  // Interview dialogs
  const [isScheduleInterviewDialogOpen, setIsScheduleInterviewDialogOpen] = React.useState(false);
  const [isRescheduleInterviewDialogOpen, setIsRescheduleInterviewDialogOpen] = React.useState(false);
  const [isCompleteInterviewDialogOpen, setIsCompleteInterviewDialogOpen] = React.useState(false);
  const [interviewApplicationName, setInterviewApplicationName] = React.useState('');
  const [isSchedulingInterview, setIsSchedulingInterview] = React.useState(false);
  const [isReschedulingInterview, setIsReschedulingInterview] = React.useState(false);
  const [isCompletingInterview, setIsCompletingInterview] = React.useState(false);

  // Interviewers list (cached)
  const [interviewers, setInterviewers] = React.useState<Array<{
    id: string;
    displayName: string;
    email: string;
    schedulingLink: string | null;
  }>>([]);
  const [currentUserId, setCurrentUserId] = React.useState<string | undefined>(undefined);
  const [isLoadingInterviewers, setIsLoadingInterviewers] = React.useState(false);

  // Email loading state
  const [sendingEmailTemplate, setSendingEmailTemplate] = React.useState<string | null>(null);

  // Fullscreen pipeline (desktop only)
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Exit fullscreen on Escape
  React.useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  // Browser warning for page refresh during operations
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDecisionProcessing || sendingEmailTemplate !== null || 
          isSchedulingInterview || isReschedulingInterview || isCompletingInterview) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDecisionProcessing, sendingEmailTemplate, isSchedulingInterview, isReschedulingInterview, isCompletingInterview]);

  // Fetch pipeline data
  const fetchPipelineData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        view: 'pipeline',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(positionFilter !== 'all' && { position: positionFilter }),
      });

      const response = await fetch(`/api/applications?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pipeline data');
      }

      const data: PipelineResponse = await response.json();
      setPipelineData(data.applicationsByStage);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        title: 'Error',
        description: 'Failed to load pipeline data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, positionFilter, toast]);

  // Fetch application detail
  const fetchApplicationDetail = React.useCallback(async (id: string) => {
    try {
      setIsDetailLoading(true);

      const [appResponse, auditResponse] = await Promise.all([
        fetch(`/api/applications/${id}`),
        isAdmin ? fetch(`/api/applications/${id}/audit-log`) : Promise.resolve(null),
      ]);

      if (!appResponse.ok) {
        throw new Error('Failed to fetch application details');
      }

      const appData: ApplicationDetailResponse = await appResponse.json();
      setSelectedApplication(appData.application);

      if (auditResponse?.ok) {
        const auditData: AuditLogResponse = await auditResponse.json();
        setAuditLogs(auditData.auditLogs);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load application details',
        variant: 'destructive',
      });
      setSelectedApplicationId(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, [isAdmin, toast]);

  // Initial fetch
  React.useEffect(() => {
    fetchPipelineData();
  }, [fetchPipelineData]);

  // Fetch detail when selection changes
  React.useEffect(() => {
    if (selectedApplicationId) {
      fetchApplicationDetail(selectedApplicationId);
    } else {
      setSelectedApplication(null);
      setAuditLogs(undefined);
    }
  }, [selectedApplicationId, fetchApplicationDetail]);

  // Handlers
  const handleViewApplication = (id: string) => {
    setSelectedApplicationId(id);
  };

  const handleCloseDetail = () => {
    setSelectedApplicationId(null);
  };

  const handleSendEmail = async (templateName: string) => {
    if (!selectedApplicationId) return;

    setSendingEmailTemplate(templateName);
    try {
      const response = await fetch(`/api/applications/${selectedApplicationId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send email');
      }

      toast({
        title: 'Email Sent',
        description: 'The email has been sent successfully',
      });

      // Small delay to ensure activity log updates
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Refresh the detail
      fetchApplicationDetail(selectedApplicationId);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setSendingEmailTemplate(null);
    }
  };

  const handleScheduleInterview = async () => {
    if (!selectedApplication) return;

    // Set application name and open dialog immediately
    setInterviewApplicationName(
      `${selectedApplication.person.firstName} ${selectedApplication.person.lastName}`
    );
    setIsScheduleInterviewDialogOpen(true);

    // Fetch interviewers list if not already loaded
    if (interviewers.length === 0) {
      setIsLoadingInterviewers(true);
      try {
        const [usersResponse, sessionResponse] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/auth/session'),
        ]);

        if (usersResponse.ok) {
          const data = await usersResponse.json();
          setInterviewers(data.users || []);
        }

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setCurrentUserId(sessionData.user?.dbUserId);
        }
      } catch (err) {
        console.error('Failed to fetch interviewers:', err);
        toast({
          title: 'Warning',
          description: 'Failed to load interviewer list',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingInterviewers(false);
      }
    }
  };

  const handleRescheduleInterview = async () => {
    if (!selectedApplication) return;

    // Set application name and open dialog immediately
    setInterviewApplicationName(
      `${selectedApplication.person.firstName} ${selectedApplication.person.lastName}`
    );
    setIsRescheduleInterviewDialogOpen(true);

    // Fetch interviewers list if not already loaded
    if (interviewers.length === 0) {
      setIsLoadingInterviewers(true);
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setInterviewers(data.users || []);
        }
      } catch (err) {
        console.error('Failed to fetch interviewers:', err);
        toast({
          title: 'Warning',
          description: 'Failed to load interviewer list',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingInterviewers(false);
      }
    }
  };

  const handleCompleteInterview = () => {
    if (!selectedApplication) return;

    setInterviewApplicationName(
      `${selectedApplication.person.firstName} ${selectedApplication.person.lastName}`
    );
    setIsCompleteInterviewDialogOpen(true);
  };

  const handleScheduleInterviewConfirm = async (data: {
    interviewerId: string;
    sendEmail: boolean;
  }) => {
    if (!selectedApplicationId) return;

    setIsSchedulingInterview(true);
    try {
      const response = await fetch(`/api/applications/${selectedApplicationId}/schedule-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule interview');
      }

      const result = await response.json();

      toast({
        title: 'Interview Scheduled',
        description: result.message || 'Interview invitation sent successfully',
      });

      // Small delay to ensure activity log updates
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Refresh the detail and pipeline
      await fetchApplicationDetail(selectedApplicationId);
      fetchPipelineData();

      setIsScheduleInterviewDialogOpen(false);
    } catch (err) {
      throw err; // Let dialog handle error display
    } finally {
      setIsSchedulingInterview(false);
    }
  };

  const handleRescheduleInterviewConfirm = async (data: {
    interviewerId: string;
    resendEmail: boolean;
  }) => {
    if (!selectedApplicationId) return;

    setIsReschedulingInterview(true);
    try {
      const response = await fetch(`/api/applications/${selectedApplicationId}/reschedule-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reschedule interview');
      }

      const result = await response.json();

      toast({
        title: 'Interview Rescheduled',
        description: result.message || 'Interview updated successfully',
      });

      // Small delay to ensure activity log updates
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Refresh the detail and pipeline
      await fetchApplicationDetail(selectedApplicationId);
      fetchPipelineData();

      setIsRescheduleInterviewDialogOpen(false);
    } catch (err) {
      throw err; // Let dialog handle error display
    } finally {
      setIsReschedulingInterview(false);
    }
  };

  const handleCompleteInterviewConfirm = async (data: {
    notes: string;
  }) => {
    if (!selectedApplicationId) return;

    setIsCompletingInterview(true);
    try {
      const response = await fetch(`/api/applications/${selectedApplicationId}/complete-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete interview');
      }

      const result = await response.json();

      toast({
        title: 'Interview Completed',
        description: result.message || 'Interview marked as completed',
      });

      // Small delay to ensure activity log updates
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Refresh the detail
      await fetchApplicationDetail(selectedApplicationId);

      setIsCompleteInterviewDialogOpen(false);
    } catch (err) {
      throw err; // Let dialog handle error display
    } finally {
      setIsCompletingInterview(false);
    }
  };

  const handleMakeDecision = async (decision: 'ACCEPT' | 'REJECT') => {
    if (!selectedApplication) return;

    setDecisionType(decision);
    setDecisionApplicationName(
      `${selectedApplication.person.firstName} ${selectedApplication.person.lastName}`
    );
    setIsDecisionDialogOpen(true);
  };

  const handleDecisionConfirm = async (data: {
    decision: 'ACCEPT' | 'REJECT';
    reason: string;
    notes?: string;
    sendEmail: boolean;
  }) => {
    if (!selectedApplicationId) return;

    setIsDecisionProcessing(true);
    try {
      const response = await fetch(`/api/applications/${selectedApplicationId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record decision');
      }

      const result = await response.json();

      toast({
        title: data.decision === 'ACCEPT' ? 'Application Accepted' : 'Application Rejected',
        description: result.message || 'Decision recorded successfully',
      });

      // Small delay to ensure activity log updates
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Refresh the detail and pipeline
      await fetchApplicationDetail(selectedApplicationId);
      fetchPipelineData();

      setIsDecisionDialogOpen(false);
    } catch (err) {
      // Let DecisionDialog handle the error display (keep dialog open)
      throw err;
    } finally {
      setIsDecisionProcessing(false);
    }
  };

  const handleExportPdf = React.useCallback(async (applicationId: string) => {
    try {
      setExportingPdfId(applicationId);

      const response = await fetch(`/api/applications/${applicationId}/export-pdf`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to export PDF' }));
        throw new Error(data.error || 'Failed to export PDF');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'candidate-report.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'PDF Exported',
        description: `${filename} has been downloaded`,
      });
    } catch (err) {
      toast({
        title: 'Export Failed',
        description: err instanceof Error ? err.message : 'Failed to export PDF',
        variant: 'destructive',
      });
    } finally {
      setExportingPdfId(null);
    }
  }, [toast]);

  // Withdraw handlers
  const handleWithdrawClick = React.useCallback((applicationId: string) => {
    // Find the application to get its name
    if (!pipelineData) return;
    
    for (const stage of Object.keys(pipelineData) as (keyof PipelineBoardData)[]) {
      const app = pipelineData[stage].find(a => a.id === applicationId);
      if (app) {
        setWithdrawApplicationId(applicationId);
        setWithdrawApplicationName(`${app.person.firstName} ${app.person.lastName}`);
        return;
      }
    }
  }, [pipelineData]);

  const handleWithdrawClose = React.useCallback(() => {
    setWithdrawApplicationId(null);
    setWithdrawApplicationName('');
  }, []);

  const handleDenyApplication = React.useCallback(async () => {
    if (!withdrawApplicationId) return;
    
    setIsWithdrawProcessing(true);
    try {
      // Set status to WITHDRAWN (soft delete)
      const response = await fetch(`/api/applications/${withdrawApplicationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Application denied by administrator' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to withdraw application');
      }

      // Send rejection email
      await fetch(`/api/applications/${withdrawApplicationId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName: 'rejection' }),
      });

      toast({
        title: 'Application Withdrawn',
        description: 'The application has been withdrawn and a rejection email has been sent.',
      });

      // Refresh the pipeline
      fetchPipelineData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to withdraw application',
        variant: 'destructive',
      });
    } finally {
      setIsWithdrawProcessing(false);
    }
  }, [withdrawApplicationId, toast, fetchPipelineData]);

  const handleDeleteApplication = React.useCallback(async () => {
    if (!withdrawApplicationId) return;
    
    setIsWithdrawProcessing(true);
    try {
      // Hard delete the application
      const response = await fetch(`/api/applications/${withdrawApplicationId}?hardDelete=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete application');
      }

      toast({
        title: 'Application Deleted',
        description: 'The application and all associated data have been permanently deleted.',
      });

      // Refresh the pipeline
      fetchPipelineData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete application',
        variant: 'destructive',
      });
    } finally {
      setIsWithdrawProcessing(false);
    }
  }, [withdrawApplicationId, toast, fetchPipelineData]);

  // Get unique positions for filter
  const positions = React.useMemo(() => {
    if (!stats?.byPosition) return [];
    return Object.keys(stats.byPosition).sort();
  }, [stats]);

  // Compute attention breakdown from pipeline data
  const attentionBreakdown = React.useMemo(() => {
    if (!pipelineData) return { awaitingGC: 0, awaitingSC: 0, pendingInterviews: 0, pendingAgreement: 0, total: 0 };
    const allCards = Object.values(pipelineData).flat();
    const attentionCards = allCards.filter((c) => c.needsAttention);
    return {
      awaitingGC: attentionCards.filter((c) => c.currentStage === 'APPLICATION').length,
      awaitingSC: attentionCards.filter((c) => c.currentStage === 'SPECIALIZED_COMPETENCIES').length,
      pendingInterviews: attentionCards.filter((c) => c.currentStage === 'INTERVIEW').length,
      pendingAgreement: attentionCards.filter((c) => c.currentStage === 'AGREEMENT').length,
      total: attentionCards.length,
    };
  }, [pipelineData]);

  // Filter applications by search query and needs attention (client-side filtering)
  const filteredPipelineData = React.useMemo(() => {
    if (!pipelineData) return pipelineData;
    if (!searchQuery.trim() && !needsAttentionFilter) return pipelineData;

    const query = searchQuery.toLowerCase();
    const filterFn = (app: ApplicationCardData) => {
      // Needs attention filter
      if (needsAttentionFilter && !app.needsAttention) return false;

      // Search filter
      if (query) {
        const searchFields = [
          app.person.firstName,
          app.person.lastName,
          app.person.email,
          app.position,
        ].map(f => f.toLowerCase());

        if (!searchFields.some(f => f.includes(query))) return false;
      }

      return true;
    };

    return {
      APPLICATION: pipelineData.APPLICATION.filter(filterFn),
      GENERAL_COMPETENCIES: pipelineData.GENERAL_COMPETENCIES.filter(filterFn),
      SPECIALIZED_COMPETENCIES: pipelineData.SPECIALIZED_COMPETENCIES.filter(filterFn),
      INTERVIEW: pipelineData.INTERVIEW.filter(filterFn),
      AGREEMENT: pipelineData.AGREEMENT.filter(filterFn),
      SIGNED: pipelineData.SIGNED.filter(filterFn),
    };
  }, [pipelineData, searchQuery, needsAttentionFilter]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Compact Stats Row */}
        {isLoading && !stats ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-3">
                <div className="h-5 w-16 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className={cn('grid gap-3 grid-cols-2 md:grid-cols-4 transition-opacity duration-200', isLoading && 'opacity-60')}>
            <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Applications</span>
              <span className="text-lg font-semibold tabular-nums">{stats.total}</span>
            </div>
            <button
              type="button"
              className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between text-left w-full cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setShowAttentionBreakdown(true)}
              disabled={attentionBreakdown.total === 0}
            >
              <span className="text-xs text-muted-foreground">Awaiting Action</span>
              <span className="text-lg font-semibold tabular-nums">{stats.awaitingAction}</span>
            </button>
            <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Interview</span>
              <span className="text-lg font-semibold tabular-nums">{stats.byStage?.INTERVIEW || 0}</span>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Recent (7d)</span>
              <span className="text-lg font-semibold tabular-nums">{stats.recentActivity}</span>
            </div>
          </div>
        ) : null}

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          {/* Search — full width on mobile */}
          <div className="w-full sm:flex-1 sm:min-w-[180px] sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Filter buttons row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
              </SelectContent>
            </Select>

            {/* Position Filter */}
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {positions.map((position) => (
                  <SelectItem key={position} value={position}>
                    {position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Needs Attention toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={needsAttentionFilter ? 'default' : 'outline'}
                  size="icon"
                  className={cn(
                    'size-9',
                    needsAttentionFilter
                      ? 'bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700'
                      : ''
                  )}
                  onClick={() => setNeedsAttentionFilter(v => !v)}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{needsAttentionFilter ? 'Clear attention filter' : 'View applications that need attention'}</p>
              </TooltipContent>
            </Tooltip>

            {/* Refresh */}
            <Button variant="outline" className="h-9" onClick={() => fetchPipelineData()} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Fullscreen toggle (desktop only) */}
            <Button
              variant="outline"
              className="h-9 hidden lg:flex"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Pipeline Board */}
        {error ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchPipelineData()}>
              Try Again
            </Button>
          </div>
        ) : (
          <PipelineBoard
            data={filteredPipelineData || {
              APPLICATION: [],
              GENERAL_COMPETENCIES: [],
              SPECIALIZED_COMPETENCIES: [],
              INTERVIEW: [],
              AGREEMENT: [],
              SIGNED: [],
            }}
            onViewApplication={handleViewApplication}
            onSendEmail={handleViewApplication}
            onScheduleInterview={handleViewApplication}
            onExportPdf={handleExportPdf}
            onWithdraw={handleWithdrawClick}
            exportingPdfId={exportingPdfId}
            isAdmin={isAdmin}
            isLoading={isLoading}
          />
        )}

        {/* Fullscreen Pipeline Overlay (desktop only) */}
        {isFullscreen && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Fullscreen header */}
            <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
              <span className="text-sm font-medium text-muted-foreground">Recruitment Pipeline</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={() => fetchPipelineData()} disabled={isLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setIsFullscreen(false)}>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span className="ml-1.5 text-xs">Esc</span>
                </Button>
              </div>
            </div>
            {/* Full-size pipeline */}
            <div className="flex-1 overflow-auto p-4">
              <PipelineBoard
                data={filteredPipelineData || {
                  APPLICATION: [],
                  GENERAL_COMPETENCIES: [],
                  SPECIALIZED_COMPETENCIES: [],
                  INTERVIEW: [],
                  AGREEMENT: [],
                  SIGNED: [],
                }}
                onViewApplication={handleViewApplication}
                onSendEmail={handleViewApplication}
                onScheduleInterview={handleViewApplication}
                onExportPdf={handleExportPdf}
                onWithdraw={handleWithdrawClick}
                exportingPdfId={exportingPdfId}
                isAdmin={isAdmin}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {/* Lazy-loaded modal/dialog components — each in own Suspense to avoid cross-unmounting */}
        <React.Suspense fallback={null}>
          {!!selectedApplicationId && (
            <ApplicationDetail
              application={selectedApplication}
              auditLogs={auditLogs}
              isOpen={!!selectedApplicationId}
              onClose={handleCloseDetail}
              onSendEmail={handleSendEmail}
              onScheduleInterview={handleScheduleInterview}
              onRescheduleInterview={handleRescheduleInterview}
              onCompleteInterview={handleCompleteInterview}
              onMakeDecision={handleMakeDecision}
              isAdmin={isAdmin}
              isLoading={isDetailLoading}
              sendingEmailTemplate={sendingEmailTemplate}
              isSchedulingInterview={isSchedulingInterview}
              isReschedulingInterview={isReschedulingInterview}
              isCompletingInterview={isCompletingInterview}
              isDecisionProcessing={isDecisionProcessing}
            />
          )}
        </React.Suspense>

        <React.Suspense fallback={null}>
          {!!withdrawApplicationId && (
            <WithdrawDialog
              isOpen={!!withdrawApplicationId}
              onClose={handleWithdrawClose}
              onDeny={handleDenyApplication}
              onDelete={handleDeleteApplication}
              applicationName={withdrawApplicationName}
              isProcessing={isWithdrawProcessing}
            />
          )}
        </React.Suspense>

        <React.Suspense fallback={null}>
          {isDecisionDialogOpen && (
            <DecisionDialog
              isOpen={isDecisionDialogOpen}
              onClose={() => setIsDecisionDialogOpen(false)}
              onConfirm={handleDecisionConfirm}
              decision={decisionType}
              applicationName={decisionApplicationName}
              isProcessing={isDecisionProcessing}
            />
          )}
        </React.Suspense>

        <React.Suspense fallback={null}>
          {isScheduleInterviewDialogOpen && (
            <ScheduleInterviewDialog
              isOpen={isScheduleInterviewDialogOpen}
              onClose={() => setIsScheduleInterviewDialogOpen(false)}
              onConfirm={handleScheduleInterviewConfirm}
              applicationName={interviewApplicationName}
              interviewers={interviewers}
              currentUserId={currentUserId}
              isProcessing={isSchedulingInterview}
              isLoadingInterviewers={isLoadingInterviewers}
            />
          )}
        </React.Suspense>

        <React.Suspense fallback={null}>
          {isRescheduleInterviewDialogOpen && (
            <RescheduleInterviewDialog
              isOpen={isRescheduleInterviewDialogOpen}
              onClose={() => setIsRescheduleInterviewDialogOpen(false)}
              onConfirm={handleRescheduleInterviewConfirm}
              applicationName={interviewApplicationName}
              candidateEmail={selectedApplication?.person.email || ''}
              candidateName={`${selectedApplication?.person.firstName || ''} ${selectedApplication?.person.lastName || ''}`}
              interviewers={interviewers}
              currentInterviewerId={selectedApplication?.interviews[0]?.interviewerId}
              isProcessing={isReschedulingInterview}
              isLoadingInterviewers={isLoadingInterviewers}
            />
          )}
        </React.Suspense>

        <React.Suspense fallback={null}>
          {isCompleteInterviewDialogOpen && (
            <CompleteInterviewDialog
              isOpen={isCompleteInterviewDialogOpen}
              onClose={() => setIsCompleteInterviewDialogOpen(false)}
              onConfirm={handleCompleteInterviewConfirm}
              applicationName={interviewApplicationName}
              interviewerName={selectedApplication?.interviews[0]?.interviewer?.displayName || 'Unknown'}
              isProcessing={isCompletingInterview}
            />
          )}
        </React.Suspense>

        {/* Needs Attention breakdown — Dialog on desktop, Sheet on mobile */}
        {attentionBreakdown.total > 0 && (() => {
          const breakdownContent = (
            <div className="space-y-4">
              <div className="grid gap-3">
                {attentionBreakdown.awaitingGC > 0 && (
                  <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Awaiting General Competencies</span>
                    <span className="text-lg font-semibold tabular-nums">{attentionBreakdown.awaitingGC}</span>
                  </div>
                )}
                {attentionBreakdown.awaitingSC > 0 && (
                  <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Awaiting Specialised Competencies</span>
                    <span className="text-lg font-semibold tabular-nums">{attentionBreakdown.awaitingSC}</span>
                  </div>
                )}
                {attentionBreakdown.pendingInterviews > 0 && (
                  <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Interviews</span>
                    <span className="text-lg font-semibold tabular-nums">{attentionBreakdown.pendingInterviews}</span>
                  </div>
                )}
                {attentionBreakdown.pendingAgreement > 0 && (
                  <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Agreement</span>
                    <span className="text-lg font-semibold tabular-nums">{attentionBreakdown.pendingAgreement}</span>
                  </div>
                )}
              </div>
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
                onClick={() => {
                  setNeedsAttentionFilter(true);
                  setShowAttentionBreakdown(false);
                }}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                Filter to Attention Only
              </Button>
            </div>
          );

          return isDesktop ? (
            <Dialog open={showAttentionBreakdown} onOpenChange={setShowAttentionBreakdown}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Needs Attention</DialogTitle>
                  <DialogDescription>
                    {attentionBreakdown.total} application{attentionBreakdown.total !== 1 ? 's' : ''} requiring attention
                  </DialogDescription>
                </DialogHeader>
                {breakdownContent}
              </DialogContent>
            </Dialog>
          ) : (
            <Sheet open={showAttentionBreakdown} onOpenChange={setShowAttentionBreakdown}>
              <SheetContent side="bottom" className="rounded-t-xl">
                <SheetHeader>
                  <SheetTitle>Needs Attention</SheetTitle>
                  <SheetDescription>
                    {attentionBreakdown.total} application{attentionBreakdown.total !== 1 ? 's' : ''} requiring attention
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-6 pt-2">
                  {breakdownContent}
                </div>
              </SheetContent>
            </Sheet>
          );
        })()}
      </div>
    </TooltipProvider>
  );
}
