'use client';

/**
 * Candidates Page Client Component
 *
 * Displays the recruitment pipeline with application cards organized by stage.
 * Supports filtering, searching, and viewing application details.
 */

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  PipelineBoard,
  PipelineBoardData,
  ApplicationDetail,
  ApplicationDetailData,
  ApplicationCardData,
  ScheduleInterviewDialog,
  RescheduleInterviewDialog,
  CompleteInterviewDialog,
} from '@/components/applications';
import { WithdrawDialog } from '@/components/applications/withdraw-dialog';
import { DecisionDialog } from '@/components/applications/decision-dialog';
import { strings } from '@/config';
import { Stage, Status } from '@/lib/generated/prisma/client';
import { Search, RefreshCw, Filter, Users, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  // Filter applications by search query (client-side filtering)
  const filteredPipelineData = React.useMemo(() => {
    if (!pipelineData || !searchQuery.trim()) return pipelineData;

    const query = searchQuery.toLowerCase();
    const filterFn = (app: ApplicationCardData) => {
      const searchFields = [
        app.person.firstName,
        app.person.lastName,
        app.person.email,
        app.position,
      ].map(f => f.toLowerCase());

      return searchFields.some(f => f.includes(query));
    };

    return {
      APPLICATION: pipelineData.APPLICATION.filter(filterFn),
      GENERAL_COMPETENCIES: pipelineData.GENERAL_COMPETENCIES.filter(filterFn),
      SPECIALIZED_COMPETENCIES: pipelineData.SPECIALIZED_COMPETENCIES.filter(filterFn),
      INTERVIEW: pipelineData.INTERVIEW.filter(filterFn),
      AGREEMENT: pipelineData.AGREEMENT.filter(filterFn),
      SIGNED: pipelineData.SIGNED.filter(filterFn),
    };
  }, [pipelineData, searchQuery]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{strings.nav.candidates}</h1>
            <p className="text-muted-foreground">
              Manage candidate applications through the recruitment pipeline
            </p>
          </div>
          <Button onClick={() => fetchPipelineData()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.active} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Awaiting Action</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.awaitingAction}</div>
                <p className="text-xs text-muted-foreground">
                  Need attention
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Interview Stage</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byStage?.INTERVIEW || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Ready for interviews
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentActivity}</div>
                <p className="text-xs text-muted-foreground">
                  In the last 7 days
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px] max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
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
                <SelectTrigger className="w-[200px]">
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
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Board */}
        <Card>
          <CardHeader>
            <CardTitle>Recruitment Pipeline</CardTitle>
            <CardDescription>
              Applications organized by recruitment stage
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Application Detail Modal */}
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

        {/* Withdraw Application Dialog */}
        <WithdrawDialog
          isOpen={!!withdrawApplicationId}
          onClose={handleWithdrawClose}
          onDeny={handleDenyApplication}
          onDelete={handleDeleteApplication}
          applicationName={withdrawApplicationName}
          isProcessing={isWithdrawProcessing}
        />

        {/* Decision Dialog */}
        <DecisionDialog
          isOpen={isDecisionDialogOpen}
          onClose={() => setIsDecisionDialogOpen(false)}
          onConfirm={handleDecisionConfirm}
          decision={decisionType}
          applicationName={decisionApplicationName}
          isProcessing={isDecisionProcessing}
        />

        {/* Schedule Interview Dialog */}
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

        {/* Reschedule Interview Dialog */}
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

        {/* Complete Interview Dialog */}
        <CompleteInterviewDialog
          isOpen={isCompleteInterviewDialogOpen}
          onClose={() => setIsCompleteInterviewDialogOpen(false)}
          onConfirm={handleCompleteInterviewConfirm}
          applicationName={interviewApplicationName}
          interviewerName={selectedApplication?.interviews[0]?.interviewer?.displayName || 'Unknown'}
          isProcessing={isCompletingInterview}
        />
      </div>
    </TooltipProvider>
  );
}
