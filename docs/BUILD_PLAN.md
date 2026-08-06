# RecoverKit — MVP Build Plan (20 Phases)

> **For agentic workers:** Implement phase-by-phase. Every phase ships as its own PR
> through the stage pipeline (`feature/*` → review → `staging` → promote → `main`),
> with CI gates (commitlint + typecheck + lint + build) required at every step.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the RecoverKit v0 MVP — Stripe dunning with decline-code-aware retries,
no-login card update pages, and an ROI dashboard — across 20 focused phases.

**Architecture:** Next.js App Router app (dashboard, API routes, magic-link card update
page) + Supabase Postgres + Stripe (OAuth, webhooks) + Resend email + Vercel cron.
One phase = one mergeable unit = one PR. Foundation first, then data, then Stripe
ingestion, then recovery UX, then dashboard, then hardening.

**Tech Stack:** Next.js 15 (App Router, React 19), TypeScript, Tailwind CSS v4,
Supabase/Postgres, Stripe SDK + webhooks, Resend + React Email, Vercel cron.

---

## Phase map (SPEC §6 items in bold)

| Phase | Title | Spec item | Ship |
|---|---|---|---|
| 1 | **App scaffold** | — | boots, CI full gate green |
| 2 | Design system + landing page | validation asset | waitlist capture |
| 3 | Waitlist backend | — | signups stored |
| 4 | **Data model migrations** | — | schema live |
| 5 | **Stripe OAuth connect** | §6.1 | account linked |
| 6 | **Webhook endpoint + idempotency** | §6.2 | events ingested |
| 7 | Recovery record engine | §6.2 | failed_payments managed |
| 8 | **Retry scheduler** | §6.3 | decline-aware schedule |
| 9 | **Email templates (React Email)** | §6.4 | templates render |
| 10 | Dunning sequence engine | §6.4 | sends + tracking |
| 11 | Magic-link token service | §6.5 | secure links |
| 12 | **Card update page** | §6.5 | no-login update |
| 13 | Recovery finalize flow | §6.5 | card saved + paid |
| 14 | **Dashboard (read side)** | §6.6 | MRR saved + rate |
| 15 | Dashboard detail + email log | §6.6 | per-payment timeline |
| 16 | Settings + template customization | — | merchant branding |
| 17 | Stripe backfill on connect | — | instant history |
| 18 | Testing: unit + integration + e2e | — | coverage gate |
| 19 | Polish & hardening | — | prod-grade UX |
| 20 | Release & operations | — | envs, deploy, runbooks |

---

## Phase 1 — App scaffold

**Files:**
- Create: `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`,
  `eslint.config.mjs`, `.env.example`, `app/layout.tsx`, `app/page.tsx`,
  `app/globals.css`
- Modify: `package.json` (tailwind, postcss, eslint deps), `.github/workflows/ci.yml`
  (add `checks` job), `docs/DEV_FLOW.md`, `.github/PULL_REQUEST_TEMPLATE.md`,
  `CHANGELOG.md`

- [ ] Install dev deps: `pnpm add -D tailwindcss @tailwindcss/postcss postcss eslint eslint-config-next @eslint/eslintrc`
- [ ] Write TypeScript + Next + Tailwind v4 + ESLint flat configs
- [ ] Write root layout (next/font Inter, dark foundation) + placeholder page
- [ ] Add `checks` CI job (typecheck, lint, build) — full gate live
- [ ] Verify: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` all pass
- [ ] PR → staging → review → promote to main
- [ ] Add "Typecheck, lint, build" to required checks on both branches

**Exit criteria:** `pnpm dev` boots, `pnpm build` green, CI shows both jobs green.

---

## Phase 2 — Design system + landing page

**Files:** `app/globals.css` (tokens), `components/ui/*`, `app/page.tsx` (hero,
pricing, mock dashboard, waitlist form), `app/og.png`-style visuals optional.

- [ ] Define tokens: color, type scale, spacing, radii in `@theme`
- [ ] Build the "We saved you $X" mock dashboard — the hero visual
- [ ] Landing sections: headline, 3-sentence pitch, $29/mo price block, email field
- [ ] Responsive + dark, distinctive (no generic AI template look)
- [ ] `pnpm build` green; browser-verify layout at desktop + mobile

**Exit criteria:** landing page converts the ROI story; waitlist field ready to wire.

---

## Phase 3 — Waitlist backend

**Files:** `supabase/migrations/*_waitlist.sql`, `app/api/waitlist/route.ts`,
`lib/supabase/*`, `.env.example` updates.

- [ ] Migration: `waitlist_signups` (email unique, source, created_at)
- [ ] API route: validate email, insert, idempotent (on conflict do nothing)
- [ ] RLS: allow anon insert, no read; service-role for admin reads
- [ ] Test: POST valid/invalid/duplicate emails; `pnpm build` green

**Exit criteria:** Week-1 validation funnel live (50-signup target tracked).

---

## Phase 4 — Data model migrations

**Files:** `supabase/migrations/*_recoverkit_schema.sql` (from `docs/TECHNICAL.md` §7)

- [ ] Tables: `accounts`, `customers`, `failed_payments`, `email_events`,
      `recovery_tokens`, `webhook_events` + indexes + unique constraints
- [ ] RLS strategy: service-role for webhooks/tokens, auth-scoped dashboard reads
- [ ] Migration applied to dev + staging Supabase projects

**Exit criteria:** schema matches `docs/TECHNICAL.md` §7 exactly.

---

## Phase 5 — Stripe OAuth connect

**Files:** `lib/stripe.ts`, `app/api/stripe/connect/route.ts`,
`app/api/stripe/connect/callback/route.ts`, `app/(app)/settings/page.tsx`

- [ ] OAuth start: redirect to Stripe with state token (account id)
- [ ] Callback: exchange code, store `stripe_account_id` + tokens on `accounts`
- [ ] Connect UI: "Connect Stripe" button + connected state + account name/email
- [ ] Test: full connect dance with Stripe test mode

**Exit criteria:** account can link Stripe in ~5 minutes (the SPEC promise).

---

## Phase 6 — Webhook endpoint + idempotency

**Files:** `app/api/webhooks/stripe/route.ts`, `lib/stripe-webhooks.ts`

- [ ] Raw body + `Stripe-Signature` verification (`constructEvent`)
- [ ] Idempotency: `webhook_events` atomic upsert (`ON CONFLICT DO NOTHING`)
- [ ] Dispatch: `invoice.payment_failed`, `invoice.payment_succeeded`,
      `customer.subscription.updated`, `charge.failed`
- [ ] Return 2xx fast; out-of-order safe via `created` timestamps
- [ ] Test: `stripe trigger` locally with test webhooks + duplicate delivery

**Exit criteria:** duplicate deliveries processed exactly once (the #1 build risk).

---

## Phase 7 — Recovery record engine

**Files:** `lib/recovery.ts`, `lib/decline-codes.ts`

- [ ] Upsert `failed_payments` from webhooks (decline_code, amount, attempt_count)
- [ ] Status transitions: `open → paid | void | uncollectible`
- [ ] Final-attempt detection: `next_payment_attempt == null` or status `unpaid/canceled`
- [ ] Unit tests: webhook payload → record mapping table

**Exit criteria:** every event type produces correct records; routing table matches
`docs/EMAIL_TEMPLATES.md`.

---

## Phase 8 — Retry scheduler

**Files:** `app/api/cron/retry/route.ts`, `vercel.json` (cron), `lib/scheduler.ts`

- [ ] Hourly cron: query due `failed_payments` (attempt + delay windows by decline code)
- [ ] Decline-aware schedule: `expired_card` → immediate card-update email only;
      `processing_error` → short retry; `insufficient_funds` → 24-48h window
- [ ] Respect Stripe's `next_payment_attempt`; never double-fire
- [ ] Idempotent run (lock by status); unit tests for schedule table

**Exit criteria:** scheduled actions match the EMAIL_TEMPLATES routing table.

---

## Phase 9 — Email templates (React Email)

**Files:** `emails/expired-card.tsx`, `emails/insufficient-funds.tsx`,
`emails/generic-decline.tsx`, `emails/recovery-confirmation.tsx`

- [ ] Port `docs/EMAIL_TEMPLATES.md` copy into React Email components (white-label)
- [ ] Shared layout: brand-agnostic, mobile-first, single CTA
- [ ] Render previews in dev; `pnpm build` green

**Exit criteria:** templates match the approved copy; previews render.

---

## Phase 10 — Dunning sequence engine

**Files:** `lib/dunning.ts`, `app/api/resend/webhook/route.ts`

- [ ] Send trigger: template per decline code family + delay (EMAIL_TEMPLATES table)
- [ ] Resend send + persist `email_events` (sent/delivered/opened/clicked/bounced)
- [ ] Nudge: if update link unclicked 48h → re-send
- [ ] Unit tests: routing + delay logic

**Exit criteria:** emails fire on schedule; tracking feeds the dashboard.

---

## Phase 11 — Magic-link token service

**Files:** `lib/tokens.ts`

- [ ] `crypto.randomBytes(32)` token; store SHA-256 hash in `recovery_tokens`
- [ ] Single-use (`used_at`), 7-day TTL, per-failed-payment scope
- [ ] Unit tests: generation, expiry, reuse rejection

**Exit criteria:** token security matches `docs/TECHNICAL.md` §5.

---

## Phase 12 — Card update page

**Files:** `app/recover/[token]/page.tsx`, `app/api/recover/[token]/setup-intent/route.ts`

- [ ] Validate token (hash, TTL, unused) → SetupIntent client secret
- [ ] Stripe.js `confirmSetup` card form, mobile-first, branded to the merchant
- [ ] Success / error / expired-token states
- [ ] e2e: full no-login update flow with test card

**Exit criteria:** the single biggest recovery lever works without login.

---

## Phase 13 — Recovery finalize flow

**Files:** `app/api/recover/[token]/finalize/route.ts`

- [ ] Attach payment method, set `invoice_settings.default_payment_method`
- [ ] `invoices.list(status: open)` → `invoices.pay()` each
- [ ] Mark token used; fire recovery-confirmation email
- [ ] Rate-limit the endpoint; idempotent finalize

**Exit criteria:** updated card → outstanding invoice paid automatically.

---

## Phase 14 — Dashboard (read side)

**Files:** `app/(app)/page.tsx`, `app/(app)/layout.tsx`, `lib/stats.ts`

- [ ] Auth gate (Supabase) scoped to `accounts`
- [ ] Metrics: recovered $ this month, recovery rate %, at-risk MRR, open count
- [ ] Failed payments list: amount, decline code badge, status, last action
- [ ] Unit tests for stats queries

**Exit criteria:** "We saved you $X" is real, not a mock.

---

## Phase 15 — Dashboard detail + email log

**Files:** `app/(app)/payments/[id]/page.tsx`, `app/api/emails/[id]/preview/route.ts`

- [ ] Per-payment timeline: attempts, emails sent, opens/clicks, recovery
- [ ] Template preview + email event log
- [ ] Empty/loading/error states everywhere

**Exit criteria:** support can answer "what happened to this payment?" in one screen.

---

## Phase 16 — Settings + template customization

**Files:** `app/(app)/settings/*`, `lib/template-store.ts`

- [ ] Merchant from/reply-to/support email config
- [ ] Edit template copy (per template), persisted overrides
- [ ] Sending-domain guidance (SPF/DKIM) checklist

**Exit criteria:** merchants own their email voice.

---

## Phase 17 — Stripe backfill on connect

**Files:** `lib/backfill.ts`, cron or post-connect job

- [ ] On connect: pull recent failed invoices + open invoices → seed records
- [ ] Never double-insert (reuse upsert keys); paginated, rate-limited

**Exit criteria:** dashboard shows history immediately after connect.

---

## Phase 18 — Testing: unit + integration + e2e

**Files:** `*.test.ts`, `e2e/*.spec.ts`, Playwright config, coverage gate in CI

- [ ] Unit: decline routing, scheduler, tokens, stats
- [ ] Integration: webhook handlers with real Stripe test events
- [ ] e2e: card update page, dashboard auth, landing capture
- [ ] CI: add test job + coverage threshold

**Exit criteria:** red merge impossible; key flows proven.

---

## Phase 19 — Polish & hardening

**Files:** across app

- [ ] Loading skeletons, optimistic UI, error boundaries
- [ ] Rate limiting on token endpoints + public waitlist endpoint (per-IP limiter or Turnstile); audit log; safe webhook failure alerts
- [ ] a11y pass (focus, contrast, labels); performance pass (Lighthouse > 90)
- [ ] Empty states and copy polish

**Exit criteria:** feels like a paid product, not a prototype.

---

## Phase 20 — Release & operations

**Files:** `vercel.json`, env maps, runbooks in `docs/RUNBOOK.md`

- [x] Map Vercel envs: Preview (PRs), Staging (`staging`), Production (`main`)
- [x] Deploy both branches; verify webhook endpoint + cron on staging
- [x] Monitoring: webhook failure alerts, cron success pings
- [x] Launch checklist: pricing page live, $29/mo, Stripe test→live keys
- [x] Tag `v0.2.0`

**Exit criteria:** a new account goes Connect → dunning → dashboard in one sitting.

---

## Guardrails (every phase)

- Commits: conventional, ≤ 6 words, no AI names (husky + commitlint enforce)
- CI must be green before merge: commitlint + typecheck + lint + build (+ tests from 18)
- One phase = one PR → staging; promote to main when the phase is verified
- Boring stack only (SPEC §9): no new infra without a documented reason
