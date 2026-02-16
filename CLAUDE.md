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
├── (dashboard)/              # Protected routes
│   ├── audit-log/
│   ├── candidates/
│   ├── dashboard/
│   ├── settings/
│   └── users/
├── api/
│   ├── applications/[id]/    # CRUD, schedule/reschedule interview, decision
│   ├── audit-logs/
│   ├── auth/[...nextauth]/
│   ├── dashboard/
│   ├── health/
│   ├── persons/[id]/
│   ├── users/                # Sync, CRUD
│   └── webhooks/tally/       # application, general-competencies, specialised-competencies
└── auth/                     # Login/error pages
components/
├── applications/
├── candidates/
├── dashboard/
├── layout/                   # Header, Sidebar, Footer
├── shared/
├── ui/                       # shadcn/ui primitives
└── users/
config/
├── branding.ts               # Colours, logos, organisation name
├── recruitment.ts            # Stages, thresholds, positions, rate limits
└── strings.ts                # All UI text (British English)
emails/
├── application/              # application-received
├── assessment/               # GC/SC invitations
├── decision/                 # offer-letter, rejection
├── interview/                # interview-invitation
└── onboarding/               # account-created
lib/
├── email/                    # Service, config, templates, queue
├── generated/prisma/         # Generated Prisma client
├── integrations/okta.ts      # Bidirectional Okta sync
├── pdf/                      # PDF generation + sanitisation
├── security/                 # Log sanitiser
├── services/                 # persons, applications, users
└── webhooks/                 # Tally mapper, signature verification, rate limiter
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
types/                        # application.ts, person.ts, user.ts
__tests__/
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

## Key Patterns

- **Email dedup** — Persons matched by email, not Tally respondentId
- **Webhook security** — signature verification + IP whitelist + rate limiting
- **Connection pooling** — 5 connections, 30s timeout (Dreamhost constraint)
- **Rate-limited email queue** — respects Dreamhost SMTP limits
- **PDF sanitisation** — input cleaned before rendering
- **Audit trail** — IP, user agent, before/after values on all mutations
