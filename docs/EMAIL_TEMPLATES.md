# RecoverKit — Dunning Email Templates (v0)

Version: 0.1.0 (pre-validation)
Last updated: 2026-08-05

Three templates keyed to Stripe `decline_code` families, per SPEC §6. White-labeled:
emails come from **the merchant** ("Billing at [Product]"), never from RecoverKit.

## Principles

1. **White-label.** From: `Billing at [Product] <billing@merchant.com>`; reply-to:
   merchant support. The tool is invisible; the merchant owns the relationship.
2. **One CTA per email**, above the fold, mobile-first. Everything routes to the
   no-login card update page.
3. **No shame, no urgency theater.** Never "FINAL WARNING". Be human, be brief.
4. **Transactional** — no unsubscribe footer required, but include a low-key
   "Questions? Reply to this email" line for trust.
5. **Timing by code family:**
   - `expired_card` → send **immediately** (retries are futile until card is updated)
   - `insufficient_funds` → send ~24-48h after the failed attempt (user may top up)
   - `generic_decline` (`card_declined`, `do_not_honor`, `processing_error`, unknown)
     → send ~24h after failure; offer both retry and card update
6. Send in the customer's local daytime if possible; plain-text alternative required;
   dynamic preview text; all links tracked via Resend click tracking.
7. Variables: `{{first_name}}`, `{{amount}}` (human-readable), `{{date}}`,
   `{{update_url}}`, `{{product}}`, `{{support_email}}`.

---

## Template 1 — `expired_card`

**Subject:** Your card on file expired — quick fix for {{product}}
**Preview:** It takes 30 seconds, and nothing about your plan changes.

> Hey {{first_name}},
>
> We tried to charge {{amount}} for your {{product}} plan on {{date}}, but the card
> we have on file has expired.
>
> It takes about 30 seconds to fix — just add a new card here:
>
> **[Update payment method]({{update_url}})**
>
> Nothing about your plan or access changes. We'll take care of the rest.
>
> Questions? Just reply to this email.
>
> — The {{product}} team

**Notes:** `expired_card` is the highest-converting code — the fix is unambiguous and
the email should make the action feel trivial. Send immediately; keep it short.

---

## Template 2 — `insufficient_funds`

**Subject:** Your payment didn't go through — {{product}}
**Preview:** Happens all the time. Here's what to do (30 seconds).

> Hey {{first_name}},
>
> We tried to charge {{amount}} for your {{product}} plan on {{date}}, but the card
> on file didn't have enough available funds at the time.
>
> No stress — this happens all the time. Two easy options:
>
> - **Retry the same card** — [try again]({{update_url}})
> - **Use a different card** — [update payment method]({{update_url}})
>
> We'll also retry automatically over the next few days, so if you top up your
> account, you're already covered.
>
> Questions? Just reply to this email.
>
> — The {{product}} team

**Notes:** Offers retry *and* card update without separate links (both go to the same
recovery page which handles both intents). Slightly softer than Template 1 — this is a
temporary condition, not a wrong-card problem.

---

## Template 3 — generic decline

**Subject:** We couldn't process your payment — {{product}}
**Preview:** Your card was declined by your bank. Here's the fastest fix.

> Hey {{first_name}},
>
> We had trouble charging {{amount}} for your {{product}} plan on {{date}} — the card
> on file was declined by your bank.
>
> This is often just a temporary block. The fastest fix is updating your payment
> method:
>
> **[Update payment method]({{update_url}})**
>
> The moment you do, we'll charge your outstanding invoice and everything continues
> as normal.
>
> If it keeps failing, reply to this email and we'll sort it out with you.
>
> — The {{product}} team

**Notes:** Generic catch-all for `card_declined`, `do_not_honor`, `processing_error`,
`restricted_card`, and unknown codes. No false promises — "often a temporary block"
stays honest, and the support line handles the rest.

---

## Bonus (recommended, beyond the spec'd 3): recovery confirmation

One short "all sorted" email when `invoice.payment_succeeded` fires after a recovery —
it converts a saved payment into goodwill and reduces future churn anxiety.

**Subject:** All sorted ✅ — thanks for keeping {{product}} running
> Hey {{first_name}}, your payment of {{amount}} went through and your {{product}}
> subscription is fully active again. Thanks for the quick fix!

**Notes:** No CTA needed. Cheap, high-touch, optional in v0.

---

## Template routing table (implementation)

| `decline_code` | Template | Delay |
|---|---|---|
| `expired_card` | 1 | immediate |
| `insufficient_funds` | 2 | 24-48h |
| `card_declined`, `do_not_honor`, `processing_error`, `restricted_card`, `approval_not_allowed`, unknown | 3 | ~24h |
| `incorrect_cvc`, `incorrect_number`, `stolen_card`, `lost_card` | 1 (update card) | immediate |
| `fraudulent` | 3 + no auto-retry | immediate |
