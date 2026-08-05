# RecoverKit — Technical Research

Version: 0.1.0 (pre-validation)
Last updated: 2026-08-05
Method: Stripe / Supabase / Resend docs research, August 2026.

## 1. Stripe webhook events we care about

| Event | Fires when | Key fields |
|---|---|---|
| `invoice.payment_failed` | **Once per failed attempt** (incl. Smart Retries) | `id`, `status: open`, `customer`, `subscription`, `amount_due` (cents), `attempt_count`, `next_payment_attempt` (ts **or `null` = final attempt**), `billing_reason`, `payment_intent` |
| `invoice.payment_succeeded` | Payment succeeds (recovery win) | `id`, `status: paid`, `customer`, `amount_paid`, `attempt_count`, `hosted_invoice_url` |
| `customer.subscription.updated` | Subscription properties/status change | `id`, `status` (`active`, `past_due`, `unpaid`, `canceled`), `cancel_at_period_end`, `latest_invoice` |
| `charge.failed` | Any charge fails (broader, incl. one-offs) | `id`, `status: failed`, `failure_code`, `failure_message`, `outcome` |

**Decline reason lives at** `payment_intent.last_payment_error.decline_code` (most specific)
or `.code` (error code). Use `decline_code` for template routing.

## 2. Decline codes → behavior map

| Decline code | Meaning | Recovery action |
|---|---|---|
| `insufficient_funds` | Not enough balance | Retry on schedule; email with "top up or add card" |
| `expired_card` | Expiry date passed | **Card update immediately** (retries are futile) |
| `incorrect_cvc` / `incorrect_number` | Bad data on file | Card update |
| `stolen_card` / `lost_card` | Reported lost/stolen | Card update (new card required) |
| `fraudulent` | Suspected fraud | Do **not** auto-retry; human/card update |
| `card_declined` / `do_not_honor` / `generic_decline` | Bank said no, no detail | Generic template; offer retry + update |
| `processing_error` | Transient bank/Stripe glitch | Safe to auto-retry shortly |
| `restricted_card` / `approval_not_allowed` | Bank restricts online txns | Card update |

Catch-all: `card_declined`, `generic_decline`, unknown → generic template.

## 3. Smart Retries interplay

- Stripe ML-schedules retries (default: **8 tries / 2 weeks**, configurable 1 wk–2 mo).
- `invoice.payment_failed` fires per attempt with incremented `attempt_count`.
- **Final failure detection:** `next_payment_attempt == null` OR
  `customer.subscription.updated` with `status: unpaid | canceled`.
- On final failure, Stripe follows the Customer Portal/subscription setting
  (cancel / leave open / mark uncollectible). We act *before* Stripe gives up:
  dunning emails + card update link during the retry window.
- **Idempotency is non-negotiable:** duplicate webhook delivery is normal; Stripe retries
  non-2xx responses with backoff for up to 3 days.

## 4. Webhook handler best practices (Next.js route handler)

```ts
import { headers } from 'next/headers';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = headers().get('stripe-signature')!;
  const event = stripe.webhooks.constructEvent(
    rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!,
  );

  // Idempotency ledger: unique(event_id). Use an ATOMIC upsert, not find-then-create:
  // duplicate deliveries race, and a thrown unique-violation 500s → Stripe retries
  // forever. `INSERT ... ON CONFLICT (event_id) DO NOTHING` returning rows = first time.

  switch (event.type) {
    case 'invoice.payment_failed': /* upsert failed_payment + schedule emails */ break;
    case 'invoice.payment_succeeded': /* mark paid, stop dunning, log recovery $ */ break;
    case 'customer.subscription.updated': /* final-failure detection */ break;
  }

  await db.webhookEvents.create({ event_id: event.id, type: event.type });
  return Response.json({ received: true });
}
```

Rules: use the **raw body** with `constructEvent`; record processed event ids in a
`webhook_events` table (unique `event_id`); handle out-of-order events by comparing
`created` timestamps and by refusing to *downgrade* state on stale events; return 2xx fast.

## 5. No-login card update page (magic link + SetupIntent)

1. Generate `crypto.randomBytes(32).toString('hex')` token per failed payment;
   store **hash** in `recovery_tokens` with 7-day expiry, email `https://app.recoverkit.dev/recover?token=...`.
2. Page validates token (hash lookup, not expired, not used) → server creates a
   SetupIntent for the mapped Stripe customer → returns `client_secret`.
3. Stripe.js `confirmSetup` collects the card; on success:
   - `paymentMethods.attach(pmId, { customer })`
   - `customers.update(customer, { invoice_settings: { default_payment_method: pmId } })`
   - `invoices.list({ customer, status: 'open' })` → `invoices.pay(id)` each
     (or wait for `next_payment_attempt`; paying immediately is better UX).
4. Mark token `used_at`; `customer.subscription.updated` will fire automatically.

**Security notes:** token is bearer access to *one* customer's card update — hash at rest,
short TTL, single-use, no other customer data exposed on the page, rate-limit the endpoint.

## 6. Resend (email)

```ts
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Billing at [Product] <billing@yourdomain.com>', // white-label: merchant brand, not RecoverKit
  to: customer.email,
  subject: 'Your card expired — 30-second fix',
  react: ExpiredCardEmail({ updateUrl, amount: amount_due }),
});
```

- `react:` prop supports **@react-email/components** for type-safe templates.
- **Tracking:** Resend webhooks emit `email.sent | delivered | opened | clicked | bounced`
  — store in `email_events` (per failed payment) to feed the dashboard and click-through
  nudges.
- Send from merchant's own domain (SPF/DKIM) for deliverability; reply-to set to the
  merchant, not us.

## 7. Supabase / Postgres schema (validated)

The ARCHITECTURE data model stands, plus one addition: **`webhook_events`** idempotency
ledger. Recommended DDL (UUID PKs, indexed FK paths, unique constraints where noted):

```sql
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  stripe_customer_id text not null unique,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists failed_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  stripe_invoice_id text not null unique,
  stripe_subscription_id text,
  amount_due integer not null,            -- cents
  attempt_count integer not null default 1,
  decline_code text,
  status text not null default 'open',    -- open | paid | void | uncollectible
  next_payment_attempt timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_failed_payments_customer on failed_payments(customer_id);
create index if not exists idx_failed_payments_status on failed_payments(status);

create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  failed_payment_id uuid not null references failed_payments(id) on delete cascade,
  resend_email_id text not null,
  event_type text not null,               -- sent | delivered | opened | clicked | bounced
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_events_payment on email_events(failed_payment_id);

create table if not exists recovery_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  token_hash text not null unique,        -- SHA-256 of the raw magic-link token
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_recovery_tokens_hash on recovery_tokens(token_hash);

create table if not exists webhook_events (   -- idempotency ledger
  event_id text primary key,                  -- Stripe event id (evt_...)
  type text not null,
  processed_at timestamptz not null default now()
);
```

**RLS:** the magic-link card page is unauthenticated — server routes must use the
**service role key** for token validation and payment updates. Dashboard queries use
authenticated sessions with RLS scoped to `account_id = auth.uid()`.

## 8. Decisions to lock before build

- [ ] Confirm Stripe account-level webhook secret vs. per-account webhooks (multi-tenant)
- [ ] Token TTL (7 days default) and single-use semantics
- [ ] Smart Retries: leave Stripe's on and layer our emails on top (recommended) vs. custom retry schedule
- [ ] Email sending domain + SPF/DKIM per merchant account
- [ ] Whether `invoice.pay()` immediately on card update or wait for `next_payment_attempt`
