-- Phase 16: merchant-owned email voice.
--
-- accounts.dunning_from_email    — white-label sender ("Billing at Acme <...>")
-- accounts.dunning_reply_to      — merchant support reply-to
-- accounts.dunning_support_email — support line shown in templates
-- accounts.template_overrides    — JSONB map { template_key: { subject, body } }
--                                  of merchant-edited copy; NULL = use approved
--                                  defaults (docs/EMAIL_TEMPLATES.md).

alter table public.accounts
  add column if not exists dunning_from_email text,
  add column if not exists dunning_reply_to text,
  add column if not exists dunning_support_email text,
  add column if not exists template_overrides jsonb;
