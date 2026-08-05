# RecoverKit — Competitive Research

Version: 0.1.0 (pre-validation)
Last updated: 2026-08-05
Method: web research, August 2026. Sources cited inline; verify pricing at purchase time.

## TL;DR — positioning verdict

1. **The $29/mo flat price is NOT a unique wedge.** ChurnWard already sells flat $29/mo.
   The defensible wedge is the *bundle*: decline-reason-aware AI emails + no-login card
   update UX + "we saved you $X" dashboard, all at a flat price with zero setup friction.
2. **"No-login card update links" is also table stakes** — Churnkey, Stunning, ChurnWard,
   and Gravy all have them. The differentiator is doing it *well* (conversion-optimized,
   mobile-first, magic-link) and bundling it with decline-aware copy — not having it.
3. **The README's "Stripe Smart Retries recover only ~11-15%" stat needs verification.**
   Stripe officially claims ~55-57% of retryable failed payments; independent audits land
   closer to 25-35% passive recovery. Do not ship a number competitors can fact-check us on.

## Competitors

### Churnkey — MRR/churn-scaled, feature-heavy
- Pricing: MRR/churn-volume scaled. Starter ≈ **$250/mo** (billed yearly); Core/Intelligence
  tiers ≈ **$199–$599+/mo** depending on churn volume; custom above $200K MRR.
- Features: payment recovery + **cancellation save flows**, A/B testing, retry logic,
  AI features, open-source React SDK.
- Weaknesses: expensive for indie ($250/mo on a $20K MRR SaaS is a huge slice of recovered
  revenue); bundles cancel-save flows indie founders may not want; setup complexity.
- Source: churnkey.co/pricing, churntools.com/blog/churnkey-pricing

### Stunning — MRR-scaled, closest functional competitor
- Pricing: MRR-scaled monthly tiers, e.g. ≈ **$120/mo at $40K MRR**; grows with you.
- Features: backup payment methods, abandonment emails, in-app notifications, **SMS
  dunning**, smart retries, multi-step email sequences, card update pages, alerts.
- Weaknesses: bill grows as you grow even if dunning workload is flat; email-centric
  feature set; more moving parts than an indie needs.
- Source: stunning.co

### ChurnWard — flat $29/mo, the price competitor
- Pricing: **$29/mo flat**, no MRR scaling, no % of recovery.
- Features: automated dunning for Stripe + Dodo Payments, failed payment tracking,
  expiring-card alerts, recovery email workflows, win-back emails.
- Weaknesses: no AI-personalized decline copy, no real dashboard narrative (no "saved $X"),
  newer entrant, less polish, no multi-product routing.
- Source: churnward.com

### Gravy — human concierge, enterprise
- Pricing: **% of recovered revenue (~15-25%)** plus platform fees; high entry ($997+/mo
  minimums reported historically).
- Model: human "retention specialists" do outreach. Built for high-ARPU mid-market.
- Not software, not indie. Irrelevant to v0 but confirms recovery value is real.
- Source: gravysolutions / TechCrunch coverage

### Other players (one line each)
- **RecoverJoy** — lightweight indie dunning: email sequences + card update links.
- **Chargebee Dunning** — module inside Chargebee's billing platform (vendor lock-in).
- **Recurly Dunning** — enterprise retry schedules + templates inside Recurly billing.
- **Baremetrics Recover** — dunning bundled with analytics suite.
- **Dodo Payments** — merchant of record that ChurnWard integrates with (non-competitive).

## Stripe native capabilities — and the gaps we fill

- **Smart Retries**: Stripe's ML model schedules retries based on device/time signals.
  Default recommendation: **8 tries within a 2-week window** (configurable 1 week–2 months).
- **Stripe's own claim**: ~**55-57%** of failed recurring payments recovered.
  Independent audits: ~**25-35%** passive recovery (Redux Payments et al.).
- **Customer Portal**: exists, but requires the customer to **log in** — massive drop-off
  vs. a no-login card update link. This is the single biggest friction gap.
- **Email**: Stripe's built-in billing emails are generic receipts/alerts — no
  decline-reason personalization, no multi-step dunning psychology.

## Feature matrix

| Feature | **RecoverKit** (target) | ChurnWard | Stunning | Churnkey | Gravy | Stripe native |
|---|---|---|---|---|---|---|
| Pricing model | **$29/mo flat** | $29/mo flat | MRR-scaled (~$120 @ $40K MRR) | MRR-scaled ($250+) | % of recovery | Free (in fees) |
| Target | Indie / bootstrapped | Indie | Small-mid | Growth/mid-market | Mid-market/enterprise | Everyone |
| No-login card update links | Yes | Yes | Yes | Yes | Yes | No (portal login) |
| AI-personalized decline emails | **Yes** | No | Basic templates | Yes (Intelligence tier) | Human-crafted | No |
| SMS / in-app dunning | No (v0) | No | Yes | Yes | Yes | No |
| Cancel-save flows | No (non-goal) | No | No | Yes | No | No |
| ROI dashboard ("saved you $X") | **Yes (core)** | No | Partial | Yes | Yes | No |

## What this means for RecoverKit (actions)

1. **Re-position the wedge as "the bundle at a flat price", not "the flat price".**
   Landing page must sell: decline-aware emails + no-login card update + ROI dashboard
   for $29 flat, set up in 5 minutes via Stripe OAuth.
2. **Fix the 11-15% stat before it ships.** Use "Stripe's built-in retries leave
   1 in 3 failed payments unrecovered" (independent 25-35% recovery claim) or verify
   Stripe's official numbers directly. Cite a source we can defend.
3. **Beat ChurnWard on substance, not price:** AI decline copy, dashboard ROI narrative,
   and polish are where we win the $29 buyer. ChurnWard = we match the price and win on
   product.
4. **Do not add SMS / backup cards in v0** — Stunning's turf, adds cost and complexity.
   Non-goals stay non-goals.
5. **The Stripe gap is real:** no-login recovery + decline-aware copy + visible ROI is a
   bundle Stripe will not ship natively. That is the story.
