# RecoverKit

> Failed payment recovery that pays for itself. Flat $29/mo. Not MRR-scaled.

RecoverKit is a lean, self-serve dunning tool for indie SaaS on Stripe.
AI-classified decline reasons, no-login card update pages, and a dashboard
that shows exactly how much MRR we saved you this month.

## Why this exists

- Involuntary churn is 20-40% of all SaaS churn (Baremetrics / Churnkey / Recurly)
- Average SaaS loses ~9% of revenue to failed cards
- Stripe's built-in retries alone leave most failed payments unrecovered (independent audits put passive recovery at ~25-35%)
- The existing tools are either $200+/mo suites (Churnkey), MRR-scaled (Stunning),
  or bare-bones (ChurnWard). Nobody owns the lean, indie-friendly middle.

## The wedge

1. Flat pricing — $29/mo, no MRR tiers, no quote calls
2. Failure-reason-aware AI emails — "card expired" ≠ "insufficient funds"
3. No-login card update links — the single biggest recovery lever
4. "We saved you $X" dashboard — ROI is visible, retention follows

## Status

Pre-build. Phase 0 validation (30 days, no code) per `docs/SPEC.md`.

## License

MIT
