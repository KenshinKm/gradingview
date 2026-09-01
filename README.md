# GradingView

**Know your grade before you submit.** _See your grade before your transcript does._

GradingView is an AI-powered grading estimator for high school and college
students. A student uploads **how their work will be graded** (rubric,
instructions, answer key, point breakdown…) plus **their completed work**
(essay, worksheet, practice test, quiz, multiple-choice, short/long answer, or a
mix), and GradingView estimates the likely grade with a full breakdown and
prioritized fixes — _before_ they submit.

> Every result is a rough AI estimate based on the materials provided. It is not
> a guarantee and your instructor's actual grade may differ. Not for use during
> an active or proctored exam.

---

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** — Postgres, Auth, Storage (RLS everywhere)
- **Stripe** — subscriptions, Checkout, Customer Portal, webhooks
- **LLM** — provider-agnostic (Anthropic or OpenAI-compatible), vision-capable,
  fully configurable via env. All LLM calls are server-side.
- **Vitest** — unit tests for grading math, schema validation, and entitlements

All secrets are server-only. Nothing sensitive is shipped to the browser.

---

## Architecture at a glance

```
src/
  app/
    page.tsx                     Landing page
    login/                       Supabase Auth (password + magic link)
    auth/callback|signout        Auth route handlers
    dashboard/                   Plan, usage meter, grading history
    grade/                       Core grading form (two sections + re-grade)
    results/[attemptId]/         The grade hero + full structured feedback
    pricing/                     Free / Student / Student Plus + paywall
    api/grade/                   Upload → extract → grade → validate → persist → meter
    api/assignments/[id]/        Delete an assignment + its files
    api/stripe/                  checkout · portal · webhook
  lib/
    grading/                     ⭐ The grading engine (see below)
    entitlements.ts + -core.ts   Server-authoritative usage limits (pure core is unit-tested)
    extraction/                  PDF (pdf-parse), DOCX (mammoth), TXT, image/HEIC → vision
    uploads.ts                   Validate + store + extract one file (order-preserving)
    subscriptions.ts             Stripe ⇄ DB sync, billing-period usage windows
    stripe.ts · env.ts · analytics.ts · rate-limit.ts · billing-guard.ts
supabase/migrations/             0001 schema · 0002 RLS · 0003 storage bucket + policies
```

### The grading engine (`src/lib/grading/`)

Cleanly separated so prompts/models can be tuned without touching app code.

| File | Responsibility |
|------|----------------|
| `prompt.ts` | System + user prompt. Edit this to tune grading behavior. |
| `llm.ts` | Provider-agnostic call (`LLM_PROVIDER`, `LLM_MODEL`, `LLM_VISION_MODEL`). Handles multi-image, captioned + ordered. |
| `schema.ts` | Zod schema + TS types for the structured result. Supports rubric essays **and** mixed-format work (sections, per-section `scoring_basis`, written-response feedback). |
| `normalize.ts` | Parses model JSON, **recomputes** the percentage from section points (authoritative), recomputes the letter grade, derives `scoring_basis` and a defensible range, then re-validates. Throws `GradingValidationError` on unrecoverable output. |
| `grade-math.ts` | Pure helpers: letter bands, `percentFromSections` (handles non-100-point scales), estimated range. |
| `service.ts` | `gradeSubmission()` — orchestrates the call, one safe retry on malformed output. |

**Scoring basis** is always surfaced: `rubric`, `answer_key`, `ai_inferred`, or
`mixed`. If no answer key is provided and the model judged correctness itself,
that section is clearly labeled **AI-inferred** — it never pretends a key existed.

### Usage / entitlement rules (enforced server-side only)

- Every authenticated user gets **1 free lifetime full grade** (complete result,
  nothing blurred or withheld).
- **Student** = 15 grading attempts / Stripe billing period. **Student Plus** = 30.
- Every successful initial grade _or_ re-grade = one attempt.
- **Failed** processing / server errors never consume a credit (`usage_events` is
  written only after a valid, persisted result).
- Paid usage resets on the **Stripe billing period boundary**, not the calendar
  month (subscribe Sept 17 → resets ~Oct 17).
- The frontend never sends usage counts; `getEntitlement()` always recomputes
  from `subscriptions` + `usage_events`.

### Billing modes

- **`BILLING_MODE=dev`** (only honored when `NODE_ENV !== "production"`) —
  unlimited local grades, no limits enforced. Use while iterating.
- **`BILLING_MODE=live`** (the default; forced in production) — real limits:
  - **Stripe not configured** → the **free tier still works** (1 lifetime grade
    per user). Paid plans show "coming soon" and checkout is disabled. This is
    the launch-without-Stripe state.
  - **Stripe configured** (`STRIPE_*` env set) → paid plans activate
    automatically; Checkout, webhooks and the Customer Portal come online.

Entitlement is always decided server-side by `getEntitlement()`; the dashboard
meter is display-only.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create & configure Supabase

1. Create a project at <https://supabase.com/dashboard>.
2. In **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only!)

### 3. Run database migrations

Apply the files in `supabase/migrations/` in order. Either:

**Supabase CLI (recommended):**
```bash
npm i -g supabase
supabase link --project-ref <your-ref>
supabase db push
```

**Or** paste each file into the Supabase **SQL Editor** in order:
`0001_init.sql`, `0002_rls.sql`, `0003_storage.sql`.

Migrations create: `profiles`, `subscriptions`, `assignments`,
`grading_attempts`, `submission_files`, `usage_events`; all RLS policies; the
`on_auth_user_created` trigger; and the storage bucket + policies.

### 4. Create the storage bucket

`0003_storage.sql` creates a **private** bucket named `gradingview-uploads`
with owner-scoped policies (path prefix = the user's uid). If you use a
different name, set `SUPABASE_STORAGE_BUCKET` and update the policy in the
migration.

### 5. Configure Supabase Auth

- **Authentication → Providers → Email**: enable it. Email/password and magic
  links both work out of the box.
- **Authentication → URL Configuration**:
  - Site URL: `http://localhost:3000` (dev) / your domain (prod)
  - Redirect URLs: add `http://localhost:3000/auth/callback` and
    `https://YOUR_DOMAIN/auth/callback`
**Email confirmation.** Supabase's built-in email sender is heavily
rate-limited and isn't meant for production. Migration `0005` installs a
`dev_autoconfirm_email` trigger that auto-confirms new signups so password
auth works instantly in development with no emails sent.

**Before production:** set up custom SMTP (**Authentication → Emails → SMTP**,
e.g. Resend / SendGrid), then drop the trigger to enforce real verification:

```sql
drop trigger if exists dev_autoconfirm_email on auth.users;
drop function if exists public.dev_autoconfirm_email();
```

### 6. Configure the LLM API

```env
LLM_PROVIDER=anthropic            # or "openai"
LLM_MODEL=claude-sonnet-5
LLM_VISION_MODEL=claude-sonnet-5
ANTHROPIC_API_KEY=sk-ant-...
# For OpenAI-compatible providers instead:
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-...
# OPENAI_BASE_URL=                 # optional gateway override
```

### 7. Run locally

```bash
cp .env.example .env.local        # fill in Supabase + LLM values
# keep BILLING_MODE=dev to skip Stripe for now
npm run dev
```

Open <http://localhost:3000>, create an account, and grade something.

### 8. Create Stripe products / prices

In the Stripe Dashboard (test mode):

1. **Product: "GradingView Student"** → recurring price **$19.99 / month** →
   copy the price id → `STRIPE_STUDENT_PRICE_ID`.
2. **Product: "GradingView Student Plus"** → recurring price **$49.99 / month**
   → copy the price id → `STRIPE_STUDENT_PLUS_PRICE_ID`.
3. **Developers → API keys**: `STRIPE_SECRET_KEY`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

### 9. Configure Stripe Checkout

No extra config — Checkout Sessions are created in
`src/app/api/stripe/checkout/route.ts`. Just set `NEXT_PUBLIC_SITE_URL` so the
success/cancel URLs resolve.

### 10. Configure the Stripe webhook

**Local:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
```

**Production:** Stripe Dashboard → **Developers → Webhooks → Add endpoint** →
`https://YOUR_DOMAIN/api/stripe/webhook`. Subscribe to:
`checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.paid`. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.

### 11. Configure the Stripe Customer Portal

Stripe Dashboard → **Settings → Billing → Customer portal** → activate it and
allow customers to update payment methods and cancel subscriptions. The
"Manage billing" button on the dashboard opens it.

### 12. Production environment variables

Set every variable from `.env.example` on your host, plus:

```env
NODE_ENV=production
BILLING_MODE=live                 # dev bypass is ignored in prod anyway
NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN
```

Production **fails closed**: grading is unavailable until
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STUDENT_PRICE_ID` and
`STRIPE_STUDENT_PLUS_PRICE_ID` are all set.

### 13. Deploy

Deploy to any Node host (Vercel recommended — it's a standard Next.js app):

```bash
npm run build && npm start
```

Then point the Stripe webhook and Supabase redirect URLs at the deployed
domain.

---

## Scripts

```bash
npm run dev         # local dev server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest (grade math, schema, entitlements)
```

## Tests

`npm test` covers:

- letter-grade bands and percentage math (incl. non-100-point & mixed-format rubrics)
- rubric / section point totals
- structured-response validation + normalization (recompute score, retry-safe errors)
- free lifetime credit enforcement
- paid per-billing-period limits (Student = 10, Student Plus = 20)
- billing-period (not calendar-month) usage windows
- production fail-closed when billing config is missing
- the dev bypass never leaking into production checks

## Data & privacy

- All tables have owner-scoped RLS; storage objects are private and
  path-prefixed by uid.
- Users can delete any assignment (and its stored files) from its detail page.
- Uploaded work and grading materials are treated as private user data.
