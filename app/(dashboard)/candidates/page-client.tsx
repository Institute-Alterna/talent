'use client';

/**
 * Candidates Page Client Component
 *
 * Displays the recruitment pipeline with application cards organized by stage.
 * Supports filtering, searching, and viewing application details.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  PipelineBoard,
  PipelineBoardData,
  type ApplicationDetailData,
  ApplicationCardData,
  ApplicationListView,
  type ApplicationListItem,
} from '@/components/applications';
import { AttentionBreakdownPanel } from '@/components/shared/attention-breakdown';
import { Stage, Status } from '@/lib/generated/prisma/client';
import { Search, RefreshCw, Maximize2, Minimize2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks';
import { cn } from '@/lib/utils';
import { strings } from '@/config/strings';

// Lazy-load heavy dialog components — only needed on user interaction
const ApplicationDetail = React.lazy(() => import('@/components/applications/application-detail').then(m => ({ default: m.ApplicationDetail })));
const InterviewDialog = React.lazy(() => import('@/components/applications/interview-dialog').then(m => ({ default: m.InterviewDialog })));
const CompleteInterviewDialog = React.lazy(() => import('@/components/applications/complete-interview-dialog').then(m => ({ default: m.CompleteInterviewDialog })));
const WithdrawDialog = React.lazy(() => import('@/components/applications/withdraw-dialog').then(m => ({ default: m.WithdrawDialog })));
const DecisionDialog = React.lazy(() => import('@/components/applications/decision-dialog').then(m => ({ default: m.DecisionDialog })));
const WithdrawOfferDialog = React.lazy(() => import('@/components/applications/withdraw-offer-dialog').then(m => ({ default: m.WithdrawOfferDialog })));

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
    breakdown: {
      awaitingGC: number;
      gcFailedPendingRejection: number;
      awaitingSC: number;
      pendingInterviews: number;
      pendingAgreement: number;
      total: number;
    };
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
    details?: Record<string, unknown> | null;
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
  const isActiveView = statusFilter === 'ACTIVE';

  // List view data (for non-active statuses)
  const [listData, setListData] = React.useState<ApplicationListItem[]>([]);
  const [positionFilter, setPositionFilter] = React.useState<string>('all');
  const [needsAttentionFilter, setNeedsAttentionFilter] = React.useState(false);
  const [showAttentionBreakdown, setShowAttentionBreakdown] = React.useState(false);
  const [showOlderApplications, setShowOlderApplications] = React.useState(false);
  const [listPage, setListPage] = React.useState(1);
  const [listTotalPages, setListTotalPages] = React.useState(1);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Detail modal
  const [selectedApplicationId, setSelectedApplicationId] = React.useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = React.useState<ApplicationDetailData | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditLogResponse['auditLogs'] | undefined>(undefined);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);

  // PDF export
  const [exportingPdfId, setExportingPdfId] = React.useState<string | null>(null);

  // Delete dialog
  const [withdrawApplicationId, setWithdrawApplicationId] = React.useState<string | null>(null);
  const [withdrawApplicationName, setWithdrawApplicationName] = React.useState<string>('');
  const [isWithdrawProcessing, setIsWithdrawProcessing] = React.useState(false);

  // Withdraw offer dialog
  const [withdrawOfferApplicationId, setWithdrawOfferApplicationId] = React.useState<string | null>(null);
  const [withdrawOfferApplicationName, setWithdrawOfferApplicationName] = React.useState<string>('');
  const [isWithdrawOfferProcessing, setIsWithdrawOfferProcessing] = React.useState(false);

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

  // SC invitation / review state
  const [isSendingSCInvitation, setIsSendingSCInvitation] = React.useState(false);
  const [isReviewingSC, setIsReviewingSC] = React.useState(false);

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
          isSchedulingInterview || isReschedulingInterview || isCompletingInterview ||
          isWithdrawOfferProcessing || isSendingSCInvitation || isReviewingSC) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDecisionProcessing, sendingEmailTemplate, isSchedulingInterview, isReschedulingInterview, isCompletingInterview, isWithdrawOfferProcessing, isSendingSCInvitation, isReviewingSC]);

  // Fetch pipeline data (active view) or list data (other statuses)
  const fetchPipelineData = React.useCallback(async (force?: boolean) => {
    try {
      setIsLoading(true);
      setError(null);

      if (statusFilter === 'ACTIVE') {
        // Pipeline/kanban view
        const params = new URLSearchParams({
          view: 'pipeline',
          status: 'ACTIVE',
          ...(positionFilter !== 'all' && { position: positionFilter }),
        });

        const response = await fetch(`/api/applications?${params.toString()}`, {
          ...(force && { cache: 'no-store' }),
        });
        if (!response.ok) {
          throw new Error('Failed to fetch pipeline data');
        }

        const data: PipelineResponse = await response.json();
        setPipelineData(data.applicationsByStage);
        setStats(data.stats);
        setListData([]);
      } else {
        // List view for Accepted/Rejected
        const params = new URLSearchParams({
          status: statusFilter,
          limit: '50',
          page: String(listPage),
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          ...(positionFilter !== 'all' && { position: positionFilter }),
        });

        // Default to last 1 year unless "show older" is toggled
        if (!showOlderApplications) {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          params.set('createdAfter', oneYearAgo.toISOString());
        }

        const response = await fetch(`/api/applications?${params.toString()}`, {
          ...(force && { cache: 'no-store' }),
        });
        if (!response.ok) {
          throw new Error('Failed to fetch applications');
        }

        const data = await response.json();
        setListData(data.applications || []);
        setListTotalPages(data.totalPages || 1);
        setStats(data.stats);
        setPipelineData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, positionFilter, listPage, showOlderApplications, toast]);

  // Fetch application detail
  const fetchApplicationDetail = React.useCallback(async (id: string, force?: boolean) => {
    try {
      setIsDetailLoading(true);

      const cacheOpt = force ? { cache: 'no-store' as const } : {};
      const [appResponse, auditResponse] = await Promise.all([
        fetch(`/api/applications/${id}`, cacheOpt),
        isAdmin ? fetch(`/api/applications/${id}/audit-log`, cacheOpt) : Promise.resolve(null),
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

  // Clear attention filter and fullscreen when switching away from active view
  React.useEffect(() => {
    if (!isActiveView) {
      setNeedsAttentionFilter(false);
      setIsFullscreen(false);
    }
  }, [isActiveView]);

  // Reset list page and "show older" when filters change
  React.useEffect(() => {
    setListPage(1);
    setShowOlderApplications(false);
  }, [statusFilter, positionFilter]);

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
        if (response.status === 429) {
          toast({
            title: strings.toasts.rateLimitTitle,
            description: strings.toasts.rateLimitDescription,
            variant: 'destructive',
          });
          return;
        }
        throw new Error(data.error || strings.toasts.emailError);
      }

      toast({
        title: strings.toasts.emailSent,
        description: strings.toasts.emailSentDescription,
      });

      // Small delay to ensure activity log updates
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Refresh the detail
      fetchApplicationDetail(selectedApplicationId, true);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : strings.toasts.emailError,
        variant: 'destructive',
      });
    } finally {
      setSendingEmailTemplate(null);
    }
  };

  const handleSendSCInvitation = async (competencyIds: string[]) => {
    if (!selectedApplicationId) return;

    setIsSendingSCInvitation(true);
    try {
      const response = await fetch(`/api/applications/${selectedApplicationId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: 'assessment/specialized-competencies-invitation',
          competencyIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 429) {
          toast({
            title: strings.toasts.rateLimitTitle,
            description: strings.toasts.rateLimitDescription,
            variant: 'destructive',
          });
          return;
        }
        throw new Error(data.error || 'Failed to send SC invitation');
      }

      toast({
        title: strings.toasts.emailSent,
        description: 'SC assessment invitation sent successfully',
      });

      // Small delay to ensure activity log updates
      await new Promise(resolve => setTimeout(resolve, 1500));
      fetchApplicationDetail(selectedApplicationId, true);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to send invitation',
        variant: 'destructive',
      });
      throw err; // Re-throw so useDialogSubmit shows the error
    } finally {
      setIsSendingSCInvitation(false);
    }
  };

  const handleReviewSC = async (assessmentId: string, passed: boolean) => {
    if (!selectedApplicationId) return;

    setIsReviewingSC(true);
    try {
      const response = await fetch(`/api/applications/${selectedApplicationId}/review-sc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, passed }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to review assessment');
      }

      toast({ title: passed ? 'Assessment approved' : 'Assessment rejected' });
      fetchApplicationDetail(selectedApplicationId, true);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to review assessment',
        variant: 'destructive',
      });
    } finally {
      setIsReviewingSC(false);
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
      await fetchApplicationDetail(selectedApplicationId, true);
      fetchPipelineData(true);

      setIsScheduleInterviewDialogOpen(false);
    } catch (err) {
      throw err; // Let dialog handle error display
    } finally {
      setIsSchedulingInterview(false);
    }
  };

  const handleRescheduleInterviewConfirm = async (data: {
    interviewerId: string;
    sendEmail: boolean;
  }) => {
    if (!selectedApplicationId) return;

    setIsReschedulingInterview(true);
    try {
      const response = await fetch(`/api/applications/${selectedApplicationId}/reschedule-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewerId: data.interviewerId, resendEmail: data.sendEmail }),
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
      await fetchApplicationDetail(selectedApplicationId, true);
      fetchPipelineData(true);

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
      await fetchApplicationDetail(selectedApplicationId, true);

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
    startDate?: string;
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
      await fetchApplicationDetail(selectedApplicationId, true);
      fetchPipelineData(true);

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

  // Delete handler
  const handleWithdrawClick = React.useCallback((applicationId: string) => {
    // Find the application to get its name — check pipeline data first, then list data
    if (pipelineData) {
      for (const stage of Object.keys(pipelineData) as (keyof PipelineBoardData)[]) {
        const apps = pipelineData[stage];
        const app = apps?.find(a => a.id === applicationId);
        if (app) {
          setWithdrawApplicationId(applicationId);
          setWithdrawApplicationName(`${app.person.firstName} ${app.person.lastName}`);
          return;
        }
      }
    }

    const listApp = listData.find(a => a.id === applicationId);
    if (listApp) {
      setWithdrawApplicationId(applicationId);
      setWithdrawApplicationName(`${listApp.person.firstName} ${listApp.person.lastName}`);
    }
  }, [pipelineData, listData]);

  const handleWithdrawClose = React.useCallback(() => {
    setWithdrawApplicationId(null);
    setWithdrawApplicationName('');
  }, []);

  const handleDeleteApplication = React.useCallback(async () => {
    if (!withdrawApplicationId) return;
    
    setIsWithdrawProcessing(true);
    try {
      const response = await fetch(`/api/applications/${withdrawApplicationId}`, {
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
      fetchPipelineData(true);
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

  // Withdraw offer handlers
  const handleWithdrawOfferClick = React.useCallback((applicationId: string) => {
    // Find the application to get its name — check pipeline data first, then list data
    if (pipelineData) {
      for (const stage of Object.keys(pipelineData) as (keyof PipelineBoardData)[]) {
        const apps = pipelineData[stage];
        const app = apps?.find(a => a.id === applicationId);
        if (app) {
          setWithdrawOfferApplicationId(applicationId);
          setWithdrawOfferApplicationName(`${app.person.firstName} ${app.person.lastName}`);
          return;
        }
      }
    }

    const listApp = listData.find(a => a.id === applicationId);
    if (listApp) {
      setWithdrawOfferApplicationId(applicationId);
      setWithdrawOfferApplicationName(`${listApp.person.firstName} ${listApp.person.lastName}`);
    }
  }, [pipelineData, listData]);

  const handleWithdrawOfferFromDetail = React.useCallback(() => {
    if (!selectedApplication || !selectedApplicationId) return;
    setWithdrawOfferApplicationId(selectedApplicationId);
    setWithdrawOfferApplicationName(
      `${selectedApplication.person.firstName} ${selectedApplication.person.lastName}`
    );
  }, [selectedApplication, selectedApplicationId]);

  const handleWithdrawOfferConfirm = React.useCallback(async (data: { reason: string; sendEmail: boolean }) => {
    if (!withdrawOfferApplicationId) return;

    setIsWithdrawOfferProcessing(true);
    try {
      const response = await fetch(`/api/applications/${withdrawOfferApplicationId}/withdraw-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to withdraw offer');
      }

      toast({
        title: 'Offer Withdrawn',
        description: 'The offer has been withdrawn and the application rejected.',
      });

      // Small delay to ensure activity log updates
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Refresh detail if viewing this application
      if (selectedApplicationId === withdrawOfferApplicationId) {
        await fetchApplicationDetail(selectedApplicationId, true);
      }
      fetchPipelineData(true);

      setWithdrawOfferApplicationId(null);
      setWithdrawOfferApplicationName('');
    } catch (err) {
      throw err; // Let dialog handle error display
    } finally {
      setIsWithdrawOfferProcessing(false);
    }
  }, [withdrawOfferApplicationId, selectedApplicationId, toast, fetchApplicationDetail, fetchPipelineData]);

  // Get unique positions for filter
  const positions = React.useMemo(() => {
    if (!stats?.byPosition) return [];
    return Object.keys(stats.byPosition).sort();
  }, [stats]);

  // Derive attention breakdown from server stats — single source of truth
  const attentionBreakdown = React.useMemo(() => {
    if (!stats?.breakdown) return { awaitingGC: 0, gcFailedPendingRejection: 0, awaitingSC: 0, pendingInterviews: 0, pendingAgreement: 0, total: 0 };
    return stats.breakdown;
  }, [stats]);

  // Shared search predicate — matches query against candidate name, email, and position
  const matchesSearch = React.useCallback((person: { firstName: string; lastName: string; email: string }, position: string, query: string) => {
    const fields = [person.firstName, person.lastName, person.email, position].map(f => f.toLowerCase());
    return fields.some(f => f.includes(query));
  }, []);

  // Filter applications by search query and needs attention (client-side filtering)
  const filteredPipelineData = React.useMemo(() => {
    if (!pipelineData) return pipelineData;
    if (!searchQuery.trim() && !needsAttentionFilter) return pipelineData;

    const query = searchQuery.toLowerCase();
    const filterFn = (app: ApplicationCardData) => {
      if (needsAttentionFilter && !app.needsAttention) return false;
      if (query && !matchesSearch(app.person, app.position, query)) return false;
      return true;
    };

    return {
      GENERAL_COMPETENCIES: pipelineData.GENERAL_COMPETENCIES.filter(filterFn),
      SPECIALIZED_COMPETENCIES: pipelineData.SPECIALIZED_COMPETENCIES.filter(filterFn),
      INTERVIEW: pipelineData.INTERVIEW.filter(filterFn),
      AGREEMENT: pipelineData.AGREEMENT.filter(filterFn),
      SIGNED: pipelineData.SIGNED.filter(filterFn),
    };
  }, [pipelineData, searchQuery, needsAttentionFilter, matchesSearch]);

  // Filter list data by search query (client-side)
  const filteredListData = React.useMemo(() => {
    if (!listData.length) return listData;
    if (!searchQuery.trim()) return listData;

    const query = searchQuery.toLowerCase();
    return listData.filter((app) => matchesSearch(app.person, app.position, query));
  }, [listData, searchQuery, matchesSearch]);

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
              <span className="text-xs text-muted-foreground">{isActiveView ? "Active Applications" : "Applications"}</span>
              <span className="text-lg font-semibold tabular-nums">{isActiveView ? stats.active : filteredListData.length}</span>
            </div>
            <button
              type="button"
              className={cn('rounded-lg border bg-card px-3 py-2 flex items-center justify-between text-left w-full transition-colors', isActiveView ? 'cursor-pointer hover:bg-accent/50' : 'opacity-40 cursor-default')}
              onClick={() => isActiveView && setShowAttentionBreakdown(true)}
              disabled={!isActiveView || attentionBreakdown.total === 0}
            >
              <span className="text-xs text-muted-foreground">Awaiting Action</span>
              <span className="text-lg font-semibold tabular-nums">{isActiveView ? stats.awaitingAction : '—'}</span>
            </button>
            <div className={cn('rounded-lg border bg-card px-3 py-2 flex items-center justify-between', !isActiveView && 'opacity-40')}>
              <span className="text-xs text-muted-foreground">Interview</span>
              <span className="text-lg font-semibold tabular-nums">{isActiveView ? (stats.byStage?.INTERVIEW || 0) : '—'}</span>
            </div>
            <div className={cn('rounded-lg border bg-card px-3 py-2 flex items-center justify-between', !isActiveView && 'opacity-40')}>
              <span className="text-xs text-muted-foreground">Recent (7d)</span>
              <span className="text-lg font-semibold tabular-nums">{isActiveView ? stats.recentActivity : '—'}</span>
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
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
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

            {/* Needs Attention toggle (active pipeline only) */}
            {isActiveView && (
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
            )}

            {/* Refresh */}
            <Button variant="outline" className="h-9" onClick={() => fetchPipelineData(true)} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Fullscreen toggle (desktop + active view only) */}
            {isActiveView && (
              <Button
                variant="outline"
                className="h-9 hidden lg:flex"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Pipeline Board or List View */}
        {error ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchPipelineData(true)}>
              Try Again
            </Button>
          </div>
        ) : isActiveView ? (
          <PipelineBoard
            data={filteredPipelineData || {
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
            onWithdrawOffer={handleWithdrawOfferClick}
            exportingPdfId={exportingPdfId}
            isAdmin={isAdmin}
            isLoading={isLoading}
          />
        ) : (
          <>
            <ApplicationListView
              applications={filteredListData}
              status={statusFilter as Status}
              onViewApplication={handleViewApplication}
              onExportPdf={handleExportPdf}
              exportingPdfId={exportingPdfId}
              isLoading={isLoading}
            />

            {/* Pagination controls + "Show older" toggle */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                {!showOlderApplications && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOlderApplications(true)}
                  >
                    Show older applications
                  </Button>
                )}
                {showOlderApplications && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOlderApplications(false)}
                  >
                    Hide older applications
                  </Button>
                )}
              </div>
              {listTotalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={listPage <= 1}
                    onClick={() => setListPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {listPage} of {listTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={listPage >= listTotalPages}
                    onClick={() => setListPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Fullscreen Pipeline Overlay (desktop + active view only) */}
        {isFullscreen && isActiveView && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Fullscreen header */}
            <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
              <span className="text-sm font-medium text-muted-foreground">Recruitment Pipeline</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={() => fetchPipelineData(true)} disabled={isLoading}>
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
                onWithdrawOffer={handleWithdrawOfferClick}
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
              onWithdrawOffer={handleWithdrawOfferFromDetail}
              isWithdrawingOffer={isWithdrawOfferProcessing}
              onSendSCInvitation={handleSendSCInvitation}
              isSendingSCInvitation={isSendingSCInvitation}
              onReviewSC={handleReviewSC}
              isReviewingSC={isReviewingSC}
            />
          )}
        </React.Suspense>

        <React.Suspense fallback={null}>
          {!!withdrawApplicationId && (
            <WithdrawDialog
              isOpen={!!withdrawApplicationId}
              onClose={handleWithdrawClose}
              onDelete={handleDeleteApplication}
              applicationName={withdrawApplicationName}
              isProcessing={isWithdrawProcessing}
            />
          )}
        </React.Suspense>

        <React.Suspense fallback={null}>
          {!!withdrawOfferApplicationId && (
            <WithdrawOfferDialog
              isOpen={!!withdrawOfferApplicationId}
              onClose={() => {
                setWithdrawOfferApplicationId(null);
                setWithdrawOfferApplicationName('');
              }}
              onConfirm={handleWithdrawOfferConfirm}
              applicationName={withdrawOfferApplicationName}
              isProcessing={isWithdrawOfferProcessing}
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
            <InterviewDialog
              mode="schedule"
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
            <InterviewDialog
              mode="reschedule"
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
        <AttentionBreakdownPanel
          breakdown={attentionBreakdown}
          open={showAttentionBreakdown}
          onOpenChange={setShowAttentionBreakdown}
          isDesktop={isDesktop}
          action={{
            label: 'Filter to Attention Only',
            onClick: () => {
              setNeedsAttentionFilter(true);
              setShowAttentionBreakdown(false);
            },
          }}
        />
      </div>
    </TooltipProvider>
  );
}
