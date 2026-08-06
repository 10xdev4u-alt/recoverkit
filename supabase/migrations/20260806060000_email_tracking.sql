-- Phase 9/10/11: email tracking + recovery-token scoping.
--
-- email_events.template     — which template key was sent (dashboard log +
--                            nudge logic keyed on it).
-- email_events dedup        — unique (resend_email_id, event_type) makes the
--                            Resend webhook idempotent: the initial 'sent'
--                            row is created at send time, so the webhook's
--                            duplicate 'sent' delivery is ignored.
-- recovery_tokens.failed_payment_id — scope each magic link to one failed
--                            payment (per-payment recovery page).

alter table public.email_events
  add column if not exists template text;

create unique index if not exists email_events_dedup
  on public.email_events (resend_email_id, event_type);

alter table public.recovery_tokens
  add column if not exists failed_payment_id uuid
    references public.failed_payments (id) on delete cascade;

create index if not exists idx_recovery_tokens_payment
  on public.recovery_tokens (failed_payment_id);
