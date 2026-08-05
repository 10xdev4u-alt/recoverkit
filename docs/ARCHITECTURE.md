# Architecture (MVP)

Constraint: boring and cheap. No microservices, no queue workers, no Redis.

```
Stripe ──webhook──▶ Next.js API route ──▶ Postgres (Supabase)
                        │
                        ├─▶ Retry scheduler (vercel cron, hourly)
                        ├─▶ Email sender (Resend)
                        └─▶ Dashboard (Next.js pages, same app)
```

## Components

- **Next.js app** — serves dashboard, API routes, and the magic-link card update page
- **Postgres (Supabase)** — customers, failed payments, retry schedule, email log
- **Stripe webhook** — `invoice.payment_failed` → create recovery record
- **Vercel cron** — hourly tick: which payments are due a retry or next email?
- **Resend** — dunning emails; templates keyed to decline_code
- **Card update page** — `/update/[token]`, Stripe.js, no login

## Data model (minimal)

- `accounts` — id, stripe_account_id, email settings
- `customers` — id, account_id, stripe_customer_id, email
- `failed_payments` — id, customer_id, amount, decline_code, status, attempts
- `email_events` — id, failed_payment_id, template, sent_at, clicked_at
- `recovery_tokens` — token_hash, customer_id, expires_at, used_at
- `webhook_events` — event_id (PK), type, processed_at — idempotency ledger so duplicate
  Stripe deliveries are never double-processed (see `docs/TECHNICAL.md` §4)

## Decisions locked during research (see `docs/TECHNICAL.md`)

- Card update page: magic-link token (hashed, 7-day TTL, single-use) + SetupIntent,
  then attach + set default payment method + `invoice.pay()` open invoices
- Idempotency: `webhook_events` ledger with unique `event_id`; verify
  `Stripe-Signature` on the raw body
- Final-failure detection: `next_payment_attempt == null` or subscription status
  `unpaid` / `canceled`

## What we deliberately skipped (ponytail retry)

- Background job runner — vercel cron covers it until scale says otherwise
- Multi-processor support — Stripe only in v0; Chargebee when asked
- ML model for retry timing — rule table by decline_code is 90% as good
- Custom email infrastructure — Resend API, done
