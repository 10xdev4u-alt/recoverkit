# RecoverKit — Product Spec

Version: 0.1.0 (pre-validation)
Last updated: 2026-08-03

## 1. Vision

RecoverKit is the lean, indie-priced dunning tool for Stripe SaaS.
One job: recover failed payments. Do it better than a $200+/mo suite,
charge $29/mo flat, and prove ROI on a single dashboard.

## 2. Target customer

- Solo founder / small team running a Stripe SaaS
- $5K – $500K MRR
- Currently relying on Stripe Smart Retries alone, or nothing
- Hangs out on r/SaaS, Indie Hackers, X build-in-public

## 3. Problem

- 20-40% of churn is involuntary (failed cards, not willful cancel)
- Stripe's built-in retries are passive — independent audits put recovery at ~25-35%, leaving most failed payments unrecovered (verify exact claims against Stripe docs before marketing)
- Existing dunning tools are too expensive, MRR-scaled, or bloated with
  cancel-flow features the indie doesn't need

## 4. Solution (v0)

- Connect Stripe via OAuth (5 min setup)
- Smart retry engine — decline-code-aware retry schedule
- AI-personalized dunning emails — copy varies by failure reason
- No-login card update page per customer
- Recovery dashboard: $ recovered this month, recovery rate, at-risk MRR

## 5. Non-goals (v0)

- No cancellation save flows (Churnkey's turf, not ours)
- No subscription analytics suite (Baremetrics has that)
- No human-managed recovery (Gravy's model, not software)
- No multi-processor — Stripe only in v0

## 6. MVP scope (what actually gets built first)

1. Stripe connect (OAuth)
2. Webhook listener: `invoice.payment_failed`, `invoice.payment_succeeded`,
   `customer.subscription.updated`, `charge.failed`
3. Retry scheduler keyed to decline_code
4. 3 email templates: expired card, insufficient funds, generic decline
5. Hostable card-update page (magic link, no login)
6. Minimal dashboard: recovered $ count, recovery rate %

## 7. Success metrics (validation phase)

- Landing page → 50 waitlist signups (2 weeks)
- 10-15 problem interviews completed
- 5+ pre-orders at $10 "founding member" deposit
- If < 5 pre-orders by day 30 → kill or pivot, $0 code written

## 8. Pricing (hypothesis, validate)

- Flat $29/mo, unlimited recovered revenue
- 14-day trial
- No MRR tiers, no %-of-recovery, no quote calls

## 9. Stack (decided, keep it boring)

- Next.js (App Router) — frontend + API routes
- Postgres via Supabase
- Stripe OAuth + webhooks
- Resend for email
- Vercel hosting
- Tailwind for UI

## 10. Conventions

- Conventional commits, tiny, imperative, ≤ 6 words in subject
- Spec first, code second; PR per feature
- No AI names in commit history
- Ponytail mode: the lazy solution that works is the right one
