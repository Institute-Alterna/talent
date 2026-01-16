# Alterna Talent Management System

## Project Overview

Build a complete talent management application for Institute Alterna, a non-profit focused on e-learning and computer science education. This custom application replaces Jira-based workflows with a purpose-built solution for tracking candidates from initial application through onboarding.

## Core Requirements

### Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5+
- **Database**: MySQL 8.0 (Dreamhost shared hosting)
- **ORM**: Prisma
- **Authentication**: Okta OAuth 2.0 / OIDC via next-auth
- **UI**: Tailwind CSS + shadcn/ui components
- **Email**: nodemailer (Dreamhost SMTP)
- **Deployment**: Vercel (hobby plan)

### Infrastructure Constraints

- **Database**: Dreamhost shared MySQL (utf8mb3 charset, no SSH access)
- **Email Limits**: 100 recipients/hour, 1,000/day per account
- **Deployment**: Vercel serverless functions (10s timeout, 1024MB memory)
- **Expected Volume**: ~120 candidates per year maximum
- **Team Size**: Small (administrators and hiring managers only)

## System Functionality

### 1. Webhook Integration

Create endpoint `POST /api/webhooks/tally` to receive candidate applications from Tally.so forms.

**Webhook Payload Structure** (from Tally):

```json
{
  "eventId": "...",
  "createdAt": "2026-01-16T04:08:00.976Z",
  "data": {
    "responseId": "...",
    "submissionId": "...",
    "respondentId": "...",
    "formId": "...",
    "formName": "Apply for a Role",
    "createdAt": "2020-01-01T00:00:00.000Z",
    "fields": [
      {
        "key": "question_KVavqX_...",
        "label": "position",
        "type": "HIDDEN_FIELDS",
        "value": "hello"
      },
      {
        "key": "question_qRkkYd",
        "label": "First Name",
        "type": "INPUT_TEXT",
        "value": "..."
      }
      // ... more fields
    ]
  }
}
```

**Webhook Security**:

- Signature verification using `WEBHOOK_SECRET` env var
- IP whitelist validation
- Rate limiting (100 req/min)
- Idempotency checks using `tallySubmissionId`

**Field Mapping** (Tally → Database):

- `respondentId` → `who` (unique candidate identifier)
- `question_KVavqX_*` (position) → `position`
- `question_qRkkYd` → `firstName`
- `question_Q7OOxA` → `lastName`
- `question_97oo61` → `phoneNumber`
- `question_eaYYNE` → `email`
- `question_o2vAjV` → `country`
- `question_W8jjeP` → `portfolioLink`
- `question_a2aajE` → `educationLevel`
- `question_7NppJ9` → `resumeUrl` (extract URL from file object)
- `question_bW6622` → `academicBackground`
- `question_Bx22LA` → `videoLink`
- `question_kNkk0J` → `previousExperience`
- `question_97Md1Y` → `otherFileUrl` (extract URL)
- `submissionId` → `tallySubmissionId`
- `responseId` → `tallyResponseId`

### 2. Database Schema (Prisma)

**candidates table**:

```prisma
model Candidate {
  id                  String    @id @default(uuid())
  who                 String    @unique // Candidate ID from Tally
  position            String
  firstName           String
  middleName          String?
  lastName            String
  email               String
  secondaryEmail      String?
  phoneNumber         String?
  country             String?
  city                String?
  state               String?
  countryCode         String?
  portfolioLink       String?
  educationLevel      String?
  resumeUrl           String?   // Link to Tally-hosted file
  academicBackground  String?   @db.Text
  previousExperience  String?   @db.Text
  videoLink           String?
  otherFileUrl        String?
  currentStage        Stage     @default(APPLICATION)
  status              Status    @default(ACTIVE)
  tallySubmissionId   String    @unique
  tallyResponseId     String?
  oktaUserId          String?   // NULL until hired
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  assessments         Assessment[]
  interviews          Interview[]
  decisions           Decision[]
  auditLogs           AuditLog[]
  emailLogs           EmailLog[]

  @@index([who])
  @@index([status])
  @@index([currentStage])
}

enum Stage {
  APPLICATION
  GENERAL_COMPETENCIES
  SPECIALIZED_COMPETENCIES
  INTERVIEW
  AGREEMENT
  SIGNED
}

enum Status {
  ACTIVE
  ACCEPTED
  REJECTED
  WITHDRAWN
}
```

**assessments table**:

```prisma
model Assessment {
  id              String    @id @default(uuid())
  candidateId     String
  assessmentType  AssessmentType
  score           Decimal   @db.Decimal(5,2)
  passed          Boolean
  threshold       Decimal   @db.Decimal(5,2)
  completedAt     DateTime
  rawData         Json?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  candidate       Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  @@index([candidateId])
}

enum AssessmentType {
  GENERAL_COMPETENCIES
  SPECIALIZED_COMPETENCIES
}
```

**interviews table**:

```prisma
model Interview {
  id              String    @id @default(uuid())
  candidateId     String
  interviewerId   String
  schedulingLink  String    // Interviewer's Cal.com/Calendly link
  scheduledAt     DateTime?
  completedAt     DateTime?
  notes           String?   @db.Text
  outcome         InterviewOutcome @default(PENDING)
  emailSentAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  candidate       Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  interviewer     User      @relation(fields: [interviewerId], references: [id])

  @@index([candidateId])
  @@index([interviewerId])
}

enum InterviewOutcome {
  PENDING
  ACCEPT
  REJECT
}
```

**users table** (Alterna personnel):

```prisma
model User {
  id                    String    @id @default(uuid())
  oktaUserId            String    @unique
  email                 String    @unique // Alterna email
  secondaryEmail        String?
  firstName             String
  middleName            String?
  lastName              String
  displayName           String
  title                 String?
  city                  String?
  state                 String?
  countryCode           String?
  preferredLanguage     String    @default("en")
  timezone              String    @default("America/New_York")
  organisation          String    @default("Institute Alterna")
  operationalClearance  Clearance @default(A)
  isAdmin               Boolean   @default(false)
  schedulingLink        String?   // Personal Cal.com/Calendly link
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  lastSyncedAt          DateTime?

  interviews            Interview[]
  decisions             Decision[]
  auditLogs             AuditLog[]
  sentEmails            EmailLog[]

  @@index([oktaUserId])
  @@index([email])
}

enum Clearance {
  A
  B
  C
  // Add more in source code as needed
}
```

**audit_logs table**:

```prisma
model AuditLog {
  id            String      @id @default(uuid())
  candidateId   String?
  userId        String?
  action        String      @db.VarChar(100)
  actionType    ActionType
  details       Json?
  ipAddress     String?
  userAgent     String?     @db.Text
  createdAt     DateTime    @default(now())

  candidate     Candidate?  @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  user          User?       @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([candidateId])
  @@index([userId])
  @@index([createdAt])
}

enum ActionType {
  CREATE
  UPDATE
  DELETE
  VIEW
  EMAIL_SENT
  STATUS_CHANGE
  STAGE_CHANGE
}
```

**email_logs table**:

```prisma
model EmailLog {
  id              String      @id @default(uuid())
  candidateId     String
  recipientEmail  String
  templateName    String
  subject         String
  sentAt          DateTime?
  status          EmailStatus @default(PENDING)
  errorMessage    String?     @db.Text
  sentBy          String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  candidate       Candidate   @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  user            User?       @relation(fields: [sentBy], references: [id], onDelete: SetNull)

  @@index([candidateId])
  @@index([status])
}

enum EmailStatus {
  PENDING
  SENT
  FAILED
  BOUNCED
}
```

**decisions table**:

```prisma
model Decision {
  id            String    @id @default(uuid())
  candidateId   String
  decision      DecisionType
  reason        String    @db.Text // Required for rejections (GDPR)
  decidedBy     String
  decidedAt     DateTime  @default(now())
  notes         String?   @db.Text
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  candidate     Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  user          User      @relation(fields: [decidedBy], references: [id])

  @@index([candidateId])
}

enum DecisionType {
  ACCEPT
  REJECT
}
```

### 3. Authentication & Authorization

**Okta OAuth Integration**:

- Use next-auth with Okta provider
- Session-based authentication
- JWT tokens stored in HTTP-only cookies
- Auto-sync user data from Okta on login

**Permission Levels**:

1. **Administrators** (`isAdmin = true`):
   - Determined by Okta group membership (env: `ADMIN_OKTA_GROUP_ID`)
   - Full system access
   - Can view, edit, delete all candidates
   - Can manage users
   - Can configure system settings
   - Can send emails
   - Can make hiring decisions
   - Can export all data

2. **Hiring Managers** (`isAdmin = false`):
   - Can view all candidates
   - Can add interview notes
   - Can send interview scheduling emails
   - Can export individual candidate PDFs
   - Cannot delete candidates
   - Cannot modify other users
   - Cannot make final hiring decisions

**Okta Bidirectional Sync**:

Fields to sync:

- `email` (username in Okta)
- `firstName`, `middleName`, `lastName`
- `displayName`
- `secondaryEmail`
- `title`
- `city`, `state`, `countryCode`
- `preferredLanguage`
- `timezone`
- `organisation` (always "Institute Alterna")
- `operationalClearance` (custom Okta attribute)

Sync triggers:

- **From Okta → Local**: On user login, manual sync button (admin), optional nightly cron
- **From Local → Okta**: When admin updates user profile, when candidate is hired

### 4. Email System

**SMTP Configuration**:

- Dreamhost SMTP
- Limits: 100 recipients/hour, 1,000/day per account
- Implement rate limiting queue
- Retry failed sends (max 3 attempts)

**Email Templates**:
Store as HTML files in `/emails/` directory:

- `application-received.html`
- `general-competencies-passed.html`
- `general-competencies-failed.html`
- `specialized-competencies-passed.html`
- `specialized-competencies-failed.html`
- `interview-invitation.html`
- `offer-letter.html`
- `rejection.html`
- `account-created.html`

**Template Variables** (use `{{VARIABLE_NAME}}` syntax):

- Common: `{{CANDIDATE_FIRST_NAME}}`, `{{CANDIDATE_FULL_NAME}}`, `{{POSITION}}`, `{{APPLICATION_DATE}}`, `{{CURRENT_YEAR}}`
- Interview: `{{INTERVIEWER_NAME}}`, `{{SCHEDULING_LINK}}`, `{{INTERVIEW_DURATION}}`
- Onboarding: `{{ALTERNA_EMAIL}}`, `{{TEMPORARY_PASSWORD}}`, `{{START_DATE}}`

### 5. Dashboard UI

**Design Requirements**:

- Modern, clean aesthetic
- Mobile-responsive
- Accessible (WCAG 2.1 AA)
- Tailwind CSS + shadcn/ui components

**Dashboard Layout**:

**Overview Section**:

- Total active candidates (card)
- Candidates by stage (chart - pie or bar)
- Candidates awaiting action (card)
- Recent activity timeline

**Pipeline Visualization** (Kanban-style board):
Columns for each stage:

1. Application
2. General Competencies
3. Specialized Competencies
4. Interview
5. Agreement
6. Signed

Each candidate card shows:

- Name
- Position applied for
- Application date
- Status indicator
- Quick actions (view, email, export PDF)

**Candidate Detail View** (Modal or separate page):

Tabs:

1. **Application**:
   - Personal info
   - Education level
   - Portfolio link (clickable)
   - Resume link (to Tally file)
   - Academic background
   - Previous experience
   - Video link
   - Other files

2. **Assessments**:
   - General competencies score + pass/fail
   - Specialized competencies score + pass/fail
   - Completion dates
   - Detailed results

3. **Interview**:
   - Assigned interviewer
   - Scheduling link
   - Scheduled date/time
   - Interview notes (editable by interviewer)
   - Outcome
   - Button to send scheduling email

4. **Decision**:
   - Final decision (accept/reject)
   - Reason (required for rejections)
   - Who made decision
   - Date
   - Notes

5. **Activity**:
   - Full audit trail
   - Timeline view
   - Emails sent
   - Status changes
   - Export to PDF button

### 6. Customization Framework

**Centralized Configuration Files**:

`/config/branding.ts`:

```typescript
export const branding = {
  organisationName: 'Institute Alterna',
  primaryColor: '#2E5090',
  secondaryColor: '#4472C4',
  successColor: '#22C55E',
  warningColor: '#F59E0B',
  dangerColor: '#EF4444',
  logoPath: '/logos/alterna-logo.svg',
  logoDarkPath: '/logos/alterna-logo-dark.svg',
  faviconPath: '/logos/favicon.ico',
};
```

`/config/strings.ts`:

```typescript
export const strings = {
  dashboard: {
    title: 'Talent Dashboard',
    welcome: 'Welcome back',
    // ... all UI strings
  },
  stages: {
    application: 'Application',
    generalCompetencies: 'General Competencies',
    // ... all stage names
  },
  // ... all UI text organized by feature
};
```

`/config/recruitment.ts`:

```typescript
export const recruitment = {
  stages: [
    { id: 'application', name: 'Application', order: 1 },
    { id: 'general_competencies', name: 'General Competencies', order: 2 },
    // ...
  ],
  assessmentThresholds: {
    generalCompetencies: 70, // Pass score out of 100
    specializedCompetencies: 75,
  },
  interviewDuration: '25-30 minutes',
};
```

### 7. API Integration Framework

**Standardized API Client** (`/lib/api-client.ts`):

```typescript
class ApiClient {
  constructor(baseUrl: string, apiKey?: string) {}
  async get(endpoint: string, options?: RequestOptions): Promise<any> {}
  async post(endpoint: string, data: any, options?: RequestOptions): Promise<any> {}
  async put(endpoint: string, data: any, options?: RequestOptions): Promise<any> {}
  async delete(endpoint: string, options?: RequestOptions): Promise<any> {}
}
```

Features:

- Automatic retry with exponential backoff
- Request/response logging
- Error handling
- Auth header injection
- Timeout configuration

**Okta Integration** (`/lib/integrations/okta.ts`):

- User creation
- User updates
- User retrieval
- Group membership checking

**Extensible Design**:
Make it easy to add new integrations by:

1. Creating new file in `/lib/integrations/`
2. Extending ApiClient base class
3. Adding environment variables
4. Importing in relevant API routes

### 8. PDF Export

Use `@react-pdf/renderer` or `puppeteer` to generate PDFs of:

- Individual candidate profiles (all data)
- Audit logs for a specific candidate (full timeline)

PDF should include:

- Alterna branding
- Candidate photo (if available)
- All application data
- Assessment results
- Interview notes
- Decision and reason
- Complete activity timeline
- Generated date/time

### 9. Future Assessment Webhook

Create placeholder endpoint `POST /api/webhooks/assessment` for receiving assessment scores.

Include TODO comment: "Assessment integration to be finalized. Update this endpoint once assessment system details are confirmed."

Expected payload structure (customize as needed):

```typescript
{
  candidateId: string; // 'who' field
  assessmentType: 'general_competencies' | 'specialized_competencies';
  score: number; // 0-100
  completedAt: string; // ISO date
  answers?: any[]; // Optional detailed results
}
```

### 10. Audit Logging

**Automatic Logging**:
Create middleware/utility that logs:

- All database writes (create, update, delete)
- Email sends
- Status/stage transitions
- User logins
- Webhook receipts
- API calls to external services

**Log Details**:

- Action description
- Before/after values (for updates)
- User who performed action
- IP address
- User agent
- Timestamp

### 11. User Settings

Create settings page where users can:

- Set their scheduling link (Cal.com/Calendly)
- View their Okta profile
- Update notification preferences (future)
- View their activity history

**Validation**:

- Prevent users from booking interviews if they haven't set scheduling link
- Show warning banner on dashboard if scheduling link is missing

## Environment Variables

Total: ~25 variables. Create `.env.example` file with all required variables:

```bash
# Database
DATABASE_URL=mysql://user:password@host:3306/database
DATABASE_HOST=mysql.dreamhost.com
DATABASE_USER=db_user
DATABASE_PASSWORD=db_password

# Okta
OKTA_DOMAIN=alterna.okta.com
OKTA_CLIENT_ID=okta_client_id
OKTA_CLIENT_SECRET=okta_client_secret
OKTA_API_TOKEN=okta_api_token
OKTA_ISSUER=https://alterna.okta.com/oauth2/default
NEXTAUTH_SECRET=random_secret_string

# Email
SMTP_HOST=smtp.dreamhost.com
SMTP_PORT=587
SMTP_USER=talent@alterna.org
SMTP_PASSWORD=smtp_password
SMTP_FROM_EMAIL=talent@alterna.org

# Application
NEXTAUTH_URL=https://talent.alterna.org
NODE_ENV=production
APP_NAME=Alterna Talent Management
WEBHOOK_SECRET=tally_webhook_secret
ADMIN_OKTA_GROUP_ID=00g...

# Optional
SENTRY_DSN=
LOG_LEVEL=info
RATE_LIMIT_MAX=100
BACKUP_WEBHOOK_URL=
# Add slots for future custom API endpoints
CUSTOM_API_ENDPOINT_1=
CUSTOM_API_ENDPOINT_2=
# etc.
```

## Code Quality Standards

### TypeScript

- Strict mode enabled
- No `any` types without justification
- Comprehensive type definitions in `/types`
- Zod schemas for runtime validation

### Documentation

- JSDoc comments on all functions
- Explanatory comments for complex logic
- README files:
  - `/README.md` - Project overview, quick start
  - `/docs/SETUP.md` - Detailed setup
  - `/docs/DEPLOYMENT.md` - Deployment guide
  - `/docs/CUSTOMIZATION.md` - Branding guide
  - `/docs/API.md` - API documentation

### Code Organization

```
/app
  /(dashboard)         # Protected routes
    /candidates
    /settings
    /users
  /api
    /webhooks
    /candidates
    /users
    /auth
/components
  /ui                  # shadcn/ui
  /dashboard
  /candidates
  /shared
/lib
  /integrations
    /okta.ts
  /api-client.ts
  /email.ts
  /pdf.ts
  /audit.ts
/config
  /branding.ts
  /strings.ts
  /recruitment.ts
/emails                # HTML templates
/prisma
  /schema.prisma
  /migrations
/public
  /logos
/types
```

### Testing Requirements (Future)

Set up project structure to support:

- Unit tests (Jest)
- Integration tests (webhook endpoints)
- E2E tests (Playwright)

Add placeholder test files and configuration.

## Deployment Instructions

Include in `/docs/DEPLOYMENT.md`:

1. **Database Setup**:
   - Create MySQL database in Dreamhost
   - Run Prisma migrations
   - Verify connection

2. **Okta Configuration**:
   - Create OAuth application
   - Configure redirect URIs
   - Set up group for admins
   - Add custom attribute for operational clearance

3. **Vercel Deployment**:
   - Connect GitHub repository
   - Configure environment variables
   - Deploy
   - Test webhook endpoint

4. **Post-Deployment**:
   - Configure Tally webhook to point to deployed URL
   - Test complete candidate flow
   - Verify emails sending
   - Check audit logging

## Success Criteria

The application should:

1. ✅ Receive and process Tally webhooks correctly
2. ✅ Store candidate data in MySQL database
3. ✅ Authenticate users via Okta SSO
4. ✅ Display candidates in pipeline visualization
5. ✅ Send automated emails via Dreamhost SMTP
6. ✅ Sync user data bidirectionally with Okta
7. ✅ Generate PDF exports of candidate profiles
8. ✅ Log all actions to audit trail
9. ✅ Respect permission levels (admin vs hiring manager)
10. ✅ Be easily customizable (colors, logos, strings)
11. ✅ Run reliably on Vercel hobby plan
12. ✅ Handle rate limits gracefully
13. ✅ Provide clear error messages
14. ✅ Be well-documented
15. ✅ Include placeholder for future assessment webhook

## Additional Notes

- Prioritize code clarity and maintainability over cleverness
- Include inline comments for customization points
- Design for future extensibility (new recruitment stages, new API integrations)
- Optimize for serverless environment (connection pooling, stateless functions)
- Consider adding feature flags for future functionality
- Build mobile-responsive from the start
- Use semantic HTML for accessibility
- Implement proper loading states and error boundaries
- Add rate limiting to all public endpoints
- Validate all user inputs (both client and server side)
- Sanitize data before storing/displaying
- Use prepared statements (Prisma handles this)
- Never log sensitive data (passwords, API keys)
- Implement CORS correctly for webhook endpoints
- Add health check endpoint: `GET /api/health`

## Next Steps After Development

1. Set up staging environment for testing
2. Create sample data for demonstration
3. Train Alterna personnel on system usage
4. Monitor first few weeks of production usage
5. Gather feedback and iterate
6. Plan phase 2 features based on needs
7. Consider adding more advanced features:
   - Calendar integration for interview scheduling
   - Automated reference checking
   - Candidate portal (self-service)
   - Advanced analytics and reporting
   - Slack notifications
   - Document generation (offer letters)

---

**Remember**: This is a critical HR system. Prioritize data security, privacy (GDPR compliance), and reliability over feature richness. Build a solid foundation that can evolve with Alterna's needs.
