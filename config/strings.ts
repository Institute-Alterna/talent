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
    personnel: 'Personnel',
    settings: 'Settings',
    logout: 'Log out',
  },

  // Candidate stages
  stages: {
    application: 'Application',
    generalCompetencies: 'General Competencies',
    specializedCompetencies: 'Specialized Competencies',
    interview: 'Interview',
    agreement: 'Agreement',
    signed: 'Signed',
  },

  // Candidate statuses
  statuses: {
    active: 'Active',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
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
  },

  // Decision
  decision: {
    finalDecision: 'Final Decision',
    reason: 'Reason',
    reasonRequired: 'Reason is required for rejections',
    decidedBy: 'Decided by',
    decidedAt: 'Decision date',
    notes: 'Additional notes',
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

  // Success messages
  success: {
    saved: 'Changes saved successfully',
    deleted: 'Deleted successfully',
    emailSent: 'Email sent successfully',
    synced: 'Sync completed successfully',
  },
} as const;

export type Strings = typeof strings;
