/**
 * UI Strings Configuration
 *
 * All user-facing text in the application.
 * Centralised here for easy customisation and future localisation.
 * Uses British English spelling throughout.
 */

export const strings = {
  // Dashboard
  login: {
    action: 'Authenticate with',
    subtitle: "Only authorised personnel may access this system.",
  },
  
  dashboard: {
    title: 'Talent Dashboard',
    welcome: 'Welcome back',
    overview: 'Overview',
    pipeline: 'Pipeline',
    recentActivity: 'Recent Activity',
    noActivity: 'No recent activity',
  },

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    candidates: 'Candidates',
    competencies: 'Competencies',
    personnel: 'Personnel',
    settings: 'Settings',
    logout: 'Log out',
  },

  // Candidate stages
  stages: {
    application: 'Application',
    generalCompetencies: 'General Competencies',
    specializedCompetencies: 'Specialised Competencies',
    interview: 'Interview',
    agreement: 'Agreement',
    signed: 'Signed',
  },

  // Candidate statuses
  statuses: {
    active: 'Active',
    accepted: 'Accepted',
    rejected: 'Rejected',
    applicationRejected: 'Application Rejected',
  },

  // Competencies management
  competencies: {
    title: 'Specialised Competencies',
    subtitle: 'Manage specialised competency assessments',
    addNew: 'Add Competency',
    editCompetency: 'Edit Competency',
    deleteCompetency: 'Deactivate Competency',
    deleteConfirmTitle: 'Deactivate Competency',
    deleteConfirmDescription: 'This will deactivate the competency. Existing assessment data will be preserved. This action can be reversed.',
    reactivateCompetency: 'Reactivate Competency',
    reactivateConfirmTitle: 'Reactivate Competency',
    reactivateConfirmDescription: 'This will reactivate the competency, making it available for new assessments again.',
    name: 'Name',
    category: 'Category',
    tallyFormUrl: 'Tally Form URL',
    criterion: 'Criterion',
    criterionPlaceholder: 'Describe what the candidate must demonstrate...',
    noCompetencies: 'No specialised competencies configured yet.',
    noCompetenciesInactive: 'No deactivated competencies.',
    active: 'Active',
    inactive: 'Inactive',
    filterAll: 'All',
    filterActive: 'Active',
    filterInactive: 'Inactive',
    selectCompetencies: 'Select Competencies',
    selectCompetenciesDescription: 'Choose one or more specialised competency assessments to send.',
    multipleWarning: 'Sending multiple assessments at once may overwhelm the candidate.',
    maxReached: 'Maximum of 3 competencies can be selected.',
    reviewAssessment: 'Review Assessment',
    markPassed: 'Mark as Passed',
    markFailed: 'Mark as Failed',
    viewSubmission: 'View Submission',
    awaitingSubmission: 'Awaiting submission',
    awaitingReview: 'Awaiting review',
  },

  // Candidate detail tabs
  candidateTabs: {
    application: 'Application',
    assessments: 'Assessments',
    interview: 'Interview',
    decision: 'Decision',
    activity: 'Activity',
  },

  // Cards and metrics
  metrics: {
    totalCandidates: 'Total Active Candidates',
    byStage: 'Candidates by Stage',
    awaitingAction: 'Awaiting Action',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
  },

  // Actions
  actions: {
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    sendEmail: 'Send Email',
    exportPdf: 'Export PDF',
    scheduleInterview: 'Schedule Interview',
    makeDecision: 'Make Decision',
    accept: 'Accept',
    reject: 'Reject',
  },

  // Forms
  forms: {
    required: 'Required',
    optional: 'Optional',
    selectOption: 'Select an option',
    searchPlaceholder: 'Search...',
    filterBy: 'Filter by',
    sortBy: 'Sort by',
  },

  // Interview
  interview: {
    assignInterviewer: 'Assign Interviewer',
    schedulingLink: 'Scheduling Link',
    scheduledFor: 'Scheduled for',
    completed: 'Completed',
    pending: 'Pending',
    notes: 'Interview Notes',
    outcome: 'Outcome',
    duration: 'Duration',
    requirementNotMet: 'Candidate must pass General Competencies first',
    noInterviewScheduled: 'No interview has been scheduled yet',
    gcNotCompleted: 'General Competencies assessment must be completed first',
    gcFailed: 'Candidate did not pass General Competencies',
    // Dialog strings
    scheduleInterview: 'Schedule Interview',
    scheduleDescription: 'Send an interview invitation to the candidate for:',
    rescheduleInterview: 'Reschedule Interview',
    rescheduleDescription: 'Update the interview details for:',
    completeInterview: 'Mark Interview as Completed',
    completeDescription: 'Record the completion of the interview for:',
    selectInterviewer: 'Select Interviewer',
    selectInterviewerPlaceholder: 'Choose an interviewer...',
    interviewerRequired: 'Please select an interviewer',
    schedulingLinkRequired: 'Selected interviewer must have a scheduling link configured',
    sendInvitationEmail: 'Send invitation email to candidate',
    resendInvitationEmail: 'Resend invitation email to candidate',
    confirmSchedule: 'Schedule Interview',
    confirmReschedule: 'Reschedule Interview',
    confirmComplete: 'Mark as Completed',
    interviewNotes: 'Interview Notes',
    notesRequired: 'Interview notes are required',
    notesPlaceholder: 'Summarize the interview outcome, candidate strengths, areas of concern, and recommendations...',
    notesHelp: 'Document key points discussed, candidate performance, and your assessment.',
    rescheduleWarning: 'Interview will be rescheduled',
    contactCandidateWarning: 'Please inform the candidate about the change if needed.',
    noInterviewersAvailable: 'No interviewers with scheduling links available',
    noInterviewersHelp: 'You need to set up your scheduling link in Settings before scheduling interviews.',
  },

  // Decision
  decision: {
    finalDecision: 'Final Decision',
    reason: 'Reason',
    reasonRequired: 'Reason is required for rejections',
    decidedBy: 'Decided by',
    decidedAt: 'Decision date',
    notes: 'Additional notes',
    // Decision dialog strings
    title: 'Confirm Decision',
    acceptTitle: 'Accept Candidate',
    acceptDescription: 'This will accept the application and send the offer letter with the agreement form to the candidate.',
    rejectTitle: 'Reject Candidate',
    rejectDescription: 'This will mark the application as rejected.',
    reasonLabel: 'Reason',
    reasonPlaceholder: 'Please provide a reason for this decision...',
    reasonGdprNote: 'Reason is required for rejection decisions (GDPR compliance)',
    notesLabel: 'Additional Notes',
    notesPlaceholder: 'Any additional notes about this decision...',
    sendEmailLabel: 'Send rejection notification to candidate',
    acceptEmailInfo: 'The offer letter with the agreement form link will be sent to the candidate automatically.',
    confirmAccept: 'Confirm Accept',
    confirmReject: 'Confirm Reject',
  },

  // Email
  email: {
    sendTo: 'Send to',
    template: 'Template',
    subject: 'Subject',
    preview: 'Preview',
    sent: 'Email sent successfully',
    failed: 'Failed to send email',
  },

  // Settings
  settings: {
    title: 'Settings',
    profile: 'Profile',
    profileDescription: 'Your profile information from Universal Access',
    profileNote: 'Profile information is managed in Universal Access. Changes sync on next login.',
    schedulingLink: 'Scheduling Link',
    schedulingLinkHelp: 'Your Cal.com or Calendly link for candidate interviews',
    schedulingLinkMissing: 'Please set your scheduling link to conduct interviews',
    preferences: 'Preferences',
    activityHistory: 'Activity History',
    appearance: 'Appearance',
    appearanceDescription: 'Choose your preferred colour scheme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
  },

  // Audit Log (admin)
  auditLog: {
    title: 'Audit Log',
    description: 'Complete history of system activity',
    noLogs: 'No audit logs yet',
    noMatches: 'No logs match your filters',
    loadMore: 'Load 30 more',
    filterByActor: 'Filter by Personnel',
    allActors: 'All Personnel',
    searchPlaceholder: 'Search actions...',
  },

  // Personnel (admin)
  personnel: {
    title: 'Personnel',
    addPerson: 'Add Person',
    syncFromUA: 'Sync from UA',
    lastSynced: 'Last synced',
    admin: 'Administrator',
    hiringManager: 'Hiring Manager',
    noAccess: 'No Access',
    grantAccess: 'Grant App Access',
    makeAdmin: 'Make Admin',
    removeAdmin: 'Remove Admin',
    schedulingLinkNoAccess: 'This person needs to have access to this app in order for you to set a scheduling link.',
    inUADirectory: 'In UA directory',
    syncedFromUA: 'Complete list of Alterna personnel synced from UA directory',
  },

  // Errors
  errors: {
    generic: 'Something went wrong. Please try again.',
    notFound: 'Not found',
    unauthorized: 'You are not authorized to perform this action',
    forbidden: 'Access denied',
    validationFailed: 'Please check your input and try again',
    networkError: 'Network error. Please check your connection.',
    // Login errors handled in /app/auth/error/page.tsx
    serverConfiguration: 'There is a problem with the server configuration. Please check that all IdP environment variables are correctly set.',
    accessDenied: 'You do not have the Operational Clearance to access this resource. If this is a mistake, please contact the Safety team.',
    verificationError: 'The verification link may have expired or already been used.',
    authenticationError: 'There has been an error logging you in. Please try signing in again.',
  },

  // Empty states
  empty: {
    noCandidates: 'No candidates found',
    noResults: 'No results match your search',
    noInterviews: 'No interviews scheduled',
    noActivity: 'No activity yet',
  },

  // Confirmations
  confirm: {
    delete: 'Are you sure you want to delete this?',
    reject: 'Are you sure you want to reject this candidate?',
    sendEmail: 'Send this email?',
    unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
    makeAdmin: 'Are you sure you want to make this person an administrator? This will grant them full access to manage personnel, candidates, and system settings.',
    grantAccess: 'Are you sure you want to grant this person access to this application? They will be added to the talent-access group and be able to view and manage candidates.',
  },

  // Delete Application
  withdraw: {
    title: 'Delete Application',
    description: 'Permanently remove the application for {name} and all associated data from the system.',
    deleteWarning: 'This action cannot be undone.',
    deleteAction: 'Delete Permanently',
    menuItem: 'Delete',
  },

  // Withdraw Offer (AGREEMENT stage)
  withdrawOffer: {
    title: 'Withdraw Offer',
    description: 'Withdraw the offer for {name}. This will reject the application before the candidate signs the agreement.',
    reasonLabel: 'Reason',
    reasonPlaceholder: 'Provide a reason for withdrawing this offer...',
    reasonRequired: 'A reason is required when withdrawing an offer',
    sendEmailLabel: 'Send rejection notification to candidate',
    warning: 'This will reject the application and cannot be undone.',
    confirmAction: 'Withdraw Offer',
    menuItem: 'Withdraw Offer',
  },

  // Success messages
  success: {
    saved: 'Changes saved successfully',
    deleted: 'Deleted successfully',
    emailSent: 'Email sent successfully',
    synced: 'Sync completed successfully',
  },
} as const;

export type Strings = typeof strings;
