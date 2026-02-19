# Alterna Talent Management System

## Project Overview

A purpose-built talent management application for **Institute Alterna** — a fiscally sponsored 501(c)(3) non-profit. Replaces Jira-based workflows with a pipeline for tracking candidates from application through onboarding.

**Deployment:** Vercel (hobby plan, serverless)

**Tech Stack:**
- Next.js 16 (App Router, React 19)
- TypeScript 5+ (strict mode)
- Prisma 7 (MySQL via MariaDB adapter)
- NextAuth v5 (Okta OAuth 2.0 / OIDC)
- Tailwind CSS 4 + shadcn/ui (new-york style)
- nodemailer (Dreamhost SMTP)
- @react-pdf/renderer (PDF exports)
- Zod 4 (runtime validation)

---

## Infrastructure Constraints

- **Database**: Dreamhost shared MySQL (utf8mb3 charset, no SSH, 5 connection pool)
- **Email**: 100 recipients/hour, 1,000/day per SMTP account
- **Serverless**: 10s timeout, 1024MB memory
- **Volume**: ~120 candidates/year maximum
- **Team**: Small (administrators + hiring managers)

---

## Architecture

### Person + Application Model

Persons are deduplicated by **email** (not Tally respondentId). A person can apply to multiple positions — each application tracks its own specialised competencies, interviews, and decisions. General Competencies are assessed once per person.

### Pipeline Stages

`APPLICATION` → `GENERAL_COMPETENCIES` → `SPECIALISED_COMPETENCIES` → `INTERVIEW` → `AGREEMENT` → `SIGNED`

### Permission Levels

1. **Administrators** (`isAdmin = true`) — full access, hiring decisions, user management
2. **Hiring Managers** (`isAdmin = false`) — view candidates, interview notes, scheduling emails

Determined by Okta group membership: `talent-administration` (admins) and `talent-access` (hiring managers).

---

## File Structure

```
app/
├── actions.ts                # Server actions (login)
├── layout.tsx                # Root layout
├── page.tsx                  # Login page
├── (dashboard)/              # Protected routes
│   ├── candidates/           # Pipeline board view
│   ├── dashboard/            # Statistics overview
│   ├── log/                  # Audit log viewer
│   ├── personnel/            # User management (actions.ts uses withRoleActionGuard)
│   └── settings/             # User profile settings
├── api/
│   ├── applications/         # Application list
│   │   └── [id]/             # CRUD + sub-routes (all use requireApplicationAccess)
│   │       ├── audit-log/
│   │       ├── complete-interview/
│   │       ├── decision/
│   │       ├── export-pdf/
│   │       ├── reschedule-interview/
│   │       ├── schedule-interview/
│   │       └── send-email/
│   ├── audit-logs/
│   ├── auth/[...nextauth]/
│   ├── dashboard/
│   ├── debug/                # Development-only routes
│   ├── persons/[id]/
│   ├── users/                # Sync, CRUD, stats
│   └── webhooks/tally/       # application, general-competencies, specialized-competencies
└── auth/                     # Login/error pages
components/
├── applications/
│   ├── application-detail.tsx  # Main detail dialog (ProfileContent, buildTimelineItems, SendEmailButton)
│   ├── interview-dialog.tsx    # Unified schedule/reschedule dialog (mode prop)
│   └── ...                     # card, pipeline-board, stage/status badges, decision/withdraw dialogs
├── candidates/
├── dashboard/
│   └── pipeline-chart.tsx
├── layout/                   # Header, Sidebar, DashboardLayout
├── providers/                # ThemeProvider
├── shared/
│   ├── attention-breakdown.tsx  # Reusable Dialog/Sheet for score breakdown
│   ├── inline-error.tsx         # Error display with AlertTriangle icon
│   ├── login-form.tsx
│   ├── metric-card.tsx          # Compact metric display card
│   ├── role-badge.tsx           # Admin/HiringManager/NoAccess badge
│   ├── theme-selector.tsx
│   ├── theme-toggle.tsx
│   └── wordmark.tsx              # Inline SVG wordmark (brand "A" + "Talent" text)
├── ui/                       # shadcn/ui primitives
└── users/
    ├── user-detail-dialog.tsx
    └── users-table.tsx         # Data-driven dialogs via actionMap + openConfirmDialog
config/
├── index.ts                  # Re-exports all config modules
├── branding.ts               # Organisation name, colours, logos, auth provider name
├── recruitment.ts            # Stages, thresholds, positions, rate limits (source of truth for stage list)
└── strings.ts                # All UI text (British English)
emails/
├── application/              # application-received
├── assessment/               # GC/SC invitations
├── decision/                 # offer-letter, rejection
├── interview/                # interview-invitation
└── onboarding/               # account-created
hooks/
├── index.ts                  # Re-exports all hooks
├── use-dialog-submit.ts      # Shared dialog submission pattern (refs via useEffect)
├── use-media-query.ts        # Responsive breakpoint detection
├── use-mounted.ts            # SSR hydration guard
└── use-toast.tsx             # Toast notifications
lib/
├── api-helpers.ts            # requireAuth, requireAccess, requireAdmin, requireApplicationAccess, parseJsonBody, RouteParams
├── audit.ts                  # Audit logging functions
├── auth.config.ts            # NextAuth edge config
├── auth.ts                   # NextAuth full config with DB callbacks
├── constants.ts              # VALID_STAGES (derived from recruitment config), VALID_STATUSES
├── db.ts                     # Prisma client singleton
├── db-utils.ts               # Database utilities
├── utils.ts                  # General utilities (isValidUUID, isValidURL, calcMissingFields, etc.)
├── email/                    # Service, config, templates, queue, transporter
├── generated/prisma/         # Generated Prisma client (do not edit)
├── integrations/okta.ts      # Bidirectional Okta sync
├── pdf/                      # PDF generation + sanitisation
├── security/                 # Log sanitiser, input validation
├── services/                 # persons, applications, users, seed-cleanup
└── webhooks/                 # Tally mapper, signature verification, rate limiter
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
types/
├── index.ts                  # Re-exports all type modules
├── shared.ts                 # ActionResult, Decimal, UserReference, Interviewer, PersonSummary, PaginationMeta
├── application.ts
├── person.ts
└── user.ts
tests/
├── app/api/                  # API route tests
├── components/               # Component tests
├── fixtures/                 # Test data
└── lib/                      # Business logic tests
```

---

## Database Schema (Prisma)

**Models:** Person, Application, Assessment, Interview, Decision, User, AuditLog, EmailLog

**Key relationships:**
- Person → many Applications (email-based dedup)
- Application → Assessments (specialised), Interviews, Decisions
- Person → Assessments (general competencies)
- User → Interviews (as interviewer), Decisions (as decider)

**Enums:** Stage, Status, AssessmentType, InterviewOutcome, DecisionType, ActionType, EmailStatus, Clearance, OktaStatus

Schema is the source of truth — refer to `prisma/schema.prisma` directly.

---

## Webhook Integration

**Endpoint:** `POST /api/webhooks/tally/application`

**Security:** Signature verification (`WEBHOOK_SECRET`), IP whitelisting, rate limiting (100 req/min), idempotency via `tallySubmissionId`.

**Field Mapping** (Tally → Database):

| Tally Field | DB Field |
|---|---|
| `respondentId` | `who` (on Person) |
| `question_KVavqX_*` (position) | `position` |
| `question_qRkkYd` | `firstName` |
| `question_Q7OOxA` | `lastName` |
| `question_97oo61` | `phoneNumber` |
| `question_eaYYNE` | `email` |
| `question_o2vAjV` | `country` |
| `question_W8jjeP` | `portfolioLink` |
| `question_a2aajE` | `educationLevel` |
| `question_7NppJ9` | `resumeUrl` (extract URL from file object) |
| `question_bW6622` | `academicBackground` |
| `question_Bx22LA` | `videoLink` |
| `question_kNkk0J` | `previousExperience` |
| `question_97Md1Y` | `otherFileUrl` (extract URL) |
| `submissionId` | `tallySubmissionId` |
| `responseId` | `tallyResponseId` |

**Assessment webhooks:** `POST /api/webhooks/tally/general-competencies` and `POST /api/webhooks/tally/specialised-competencies`

---

## Email System

**Templates:** HTML files in `/emails/` with `{{VARIABLE_NAME}}` substitution syntax.

**Variables:**
- Common: `{{PERSON_FIRST_NAME}}`, `{{POSITION}}`, `{{APPLICATION_DATE}}`, `{{CURRENT_YEAR}}`
- Assessment: `{{GC_ASSESSMENT_LINK}}`, `{{SC_ASSESSMENT_LINK}}`
- Interview: `{{INTERVIEWER_NAME}}`, `{{SCHEDULING_LINK}}`, `{{INTERVIEW_DURATION}}`
- Onboarding: `{{ALTERNA_EMAIL}}`, `{{TEMPORARY_PASSWORD}}`, `{{START_DATE}}`
- Branding: `{{ORGANIZATION_NAME}}`, `{{LOGO_URL}}`, `{{PRIMARY_COLOR}}`

**Service:** Rate-limited queue, HTML-to-text conversion, retry logic (max 3), comprehensive logging.

---

## Configuration

All customisation is centralised in `/config/`:

- **`branding.ts`** — Organisation name, colours (`#2E5090` primary, `#4472C4` secondary), logo paths
- **`recruitment.ts`** — Pipeline stages, assessment thresholds (GC: 800/1000, SC: 400/600), positions, education levels, countries, GDPR retention (365 days)
- **`strings.ts`** — All UI text, organised by feature area

---

## Development Commands

```bash
npm run dev              # Development server
npm run build            # Production build
npm run deploy           # Generate Prisma + build
npm run lint             # ESLint
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier format
npm run format:check     # Prettier check
npm test                 # Unit tests (Jest, no DB)
npm run test:integration # Integration tests (requires DB)
npm run test:all         # Both unit and integration
npm run test:coverage    # Coverage report
npm run db:push          # Push schema to DB
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio
npm run db:generate      # Generate Prisma client
npx tsc --noEmit         # Type check
```

---

## Verification Requirements

**After every significant code change, run:**

1. `npm test` — ensure no regressions
2. `npx tsc --noEmit` — catch TypeScript errors
3. `npm run build` — verify production build
4. `npm run lint` — maintain code quality

Do not consider work complete until all steps pass.

---

## Notes for Development

1. **British English** for all content and UI strings, American spelling for code identifiers and Tailwind utilities
2. **Prisma 7 + MariaDB adapter** — client generated to `lib/generated/prisma`, singleton in `lib/db.ts`
3. **NextAuth v5** (beta) — session-based auth with Okta provider
4. **Tailwind CSS v4** — CSS-only config, no `tailwind.config.ts`
5. **Server Components by default** — only add `"use client"` when needed
6. **Centralised config** — all branding, strings, and recruitment settings in `/config/`
7. **Email templates** — HTML files organised by pipeline stage in `/emails/`
8. **Okta bidirectional sync** — on login, manual sync, and when admin updates profiles
9. **Audit everything** — all DB writes, email sends, status transitions, logins, webhook receipts
10. **GDPR compliance** — mandatory rejection reasons, data retention policies
11. **Commit often** — each feature or fix as a logical commit
12. **Security** — never log sensitive data, validate all inputs (client + server), sanitise before storing/displaying

---

## CI/CD

**GitHub Actions** (`.github/workflows/checks.yaml`):
- Matrix: Node.js 22.x, 24.x, latest
- Pipeline: Install → Generate Prisma → Test → Build
- Build job depends on test passing
- 26 environment secrets configured

---

## DRY Practices & Shared Abstractions

Follow these established patterns to avoid duplication when adding new features.

### API Route Helpers (`lib/api-helpers.ts`)

- **`RouteParams`** — Shared type for Next.js dynamic route params. Use `import { type RouteParams } from '@/lib/api-helpers'` instead of defining local `interface RouteParams { params: Promise<{ id: string }> }` in each route.
- **`requireApplicationAccess(params, options?)`** — Single call that combines UUID validation, auth (`requireAccess` or `requireAdmin` via `level` option), application fetch (`getApplicationDetail`), and optional active-status check (`requireActive: true`). Returns discriminated union `{ ok: true, session, application }` or `{ ok: false, error }`. Use in all `/api/applications/[id]/*` routes.
- **`parseJsonBody<T>(request)`** — Wraps `request.json()` with 400 error response on failure. Returns `{ ok: true, body }` or `{ ok: false, error }`. Eliminates try/catch JSON parsing boilerplate.

**Pattern:**
```typescript
const access = await requireApplicationAccess(params, { level: 'admin', requireActive: true });
if (!access.ok) return access.error;
const { session, application } = access;

const parsed = await parseJsonBody(request);
if (!parsed.ok) return parsed.error;
const body = parsed.body;
```

### Server Action Guards (`app/(dashboard)/personnel/actions.ts`)

- **`withRoleActionGuard(id, options, fn)`** — Higher-order function wrapping UUID validation, auth, Okta config check, optional self-action prevention, user fetch, and error handling. All role-management actions (makeAdmin, revokeAdmin, grantAppAccess, revokeAppAccess) use this.
- **`toUserListItem(user)`** — Maps Prisma `User` to client-facing `UserListItem` shape. Use whenever converting DB user objects for the client.

### Shared Types (`types/shared.ts`)

- **`ActionResult<T>`** — Generic result type for server actions: `{ success, data?, error? }`
- **`Decimal`** — Prisma Decimal type alias
- **`UserReference`** — `{ id, displayName, email }` — minimal user reference
- **`Interviewer extends UserReference`** — Adds `schedulingLink`
- **`PersonSummary`** — Compact person shape for lists
- **`PaginationMeta`** — `{ total, page, limit, totalPages }`

### Shared Hooks (`hooks/`)

- **`useDialogSubmit({ onConfirm, onClose, isProcessing, validate })`** — Encapsulates dialog submission state (loading, error, open/close). Uses internal refs via `useEffect` to avoid stale closures. Returns `{ isSubmitting, isDisabled, error, setError, handleOpenChange, handleConfirm }`.
- **`useMounted()`** — Returns `true` after first client render. Use to guard client-only rendering (e.g., theme-dependent UI).
- **`useMediaQuery(query)`** — Reactive media query match with SSR safety.

### Shared Components (`components/shared/`)

- **`InlineError`** — Error display with `AlertTriangle` icon. Use in forms/dialogs instead of inline error rendering.
- **`RoleBadge`** — Renders admin/hiring-manager/no-access/dismissed badges. Single source of truth for role display.
- **`MetricCard`** — Compact stat card with label, value, optional icon. Use in dashboards.
- **`AttentionBreakdownPanel`** — Dialog/Sheet for attention score breakdown by category.

### Component Decomposition (`components/applications/application-detail.tsx`)

- **`ProfileContent`** — Shared profile layout with `columns` prop (1 or 2). Used by both desktop `LeftPanel` and mobile `ProfileTab`.
- **`SendEmailButton`** — Encapsulates email-send button with loading state. Used by GC, SC, Interview, and Decision cards.
- **`buildTimelineItems(auditLogs)`** — Converts audit logs to timeline items. Used by both `LeftPanel` timeline and `ActivityTab`.
- **GC status values** — Pre-computed once at top of `RightPanel` (`gcConfig`, `gcScore`, `gcPassed`, `gcFailed`, `gcNotCompleted`, `gcScoreDisplay`, `isActionable`). All 4 cards reference these instead of recomputing.

### Interview Dialog (`components/applications/interview-dialog.tsx`)

- Unified dialog with `mode: 'schedule' | 'reschedule'` prop using discriminated union types. Replaces separate `schedule-interview-dialog.tsx` and `reschedule-interview-dialog.tsx`.

### Data-Driven Dialogs (`components/users/users-table.tsx`)

- **`actionMap`** — Maps dialog types to server actions, eliminating per-action click/confirm handlers.
- **`openConfirmDialog(user, type)`** — Single function opening the appropriate confirmation dialog.
- **Config-driven AlertDialog** — Single `AlertDialog` with config map for title, description, confirmLabel, destructive flag.

### Configuration as Source of Truth

- **Organisation name** — Always reference `branding.organisationName` from `config/branding.ts`. Never hardcode "Institute Alterna" in code.
- **Pipeline stages** — Defined once in `config/recruitment.ts`. `VALID_STAGES` in `lib/constants.ts` is derived from it. The Prisma `Stage` enum in `schema.prisma` must match.
- **Auth provider name** — Use `branding.authProviderName` / `branding.authProviderShortName` from config.
- **Email fallback subject** — Uses `branding.organisationName` interpolation, not a hardcoded string.

---

## Key Patterns

- **Email dedup** — Persons matched by email, not Tally respondentId
- **Webhook security** — signature verification + IP whitelist + rate limiting
- **Connection pooling** — 5 connections, 30s timeout (Dreamhost constraint)
- **Rate-limited email queue** — respects Dreamhost SMTP limits
- **PDF sanitisation** — input cleaned before rendering
- **Audit trail** — IP, user agent, before/after values on all mutations
