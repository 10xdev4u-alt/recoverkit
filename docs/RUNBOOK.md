# RecoverKit — Operations Runbook (v0.2.0)

Operational guide for running RecoverKit in production: environment maps,
deploy flow, monitoring, and the launch checklist. Companion to
`docs/ARCHITECTURE.md` (system) and `docs/DEV_FLOW.md` (dev process).

---

## 1. Environment map

Three Vercel environments; same code, different env vars.

| Env var | Production (`main`) | Staging (`staging`) | Preview (PRs) | Local | Notes |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | ✅ prod URL | ✅ stage URL | ✅ | `http://localhost:3000` | Redirect target for Connect + magic links |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ | ✅ | Same Supabase project for v0 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | ✅ | ✅ | ✅ | `sb_publishable_…` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ✅ | ✅ | `sb_secret_…` — never in client code |
| `STRIPE_SECRET_KEY` | ✅ | ✅ | ✅ | ✅ | `sk_test_…` until launch, then `sk_live_…` |
| `STRIPE_CLIENT_ID` | ✅ | ✅ | ✅ | ✅ | Connect OAuth `ca_…` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | ✅ | ✅ | ✅ | Platform `whsec_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | ✅ | ✅ | ✅ | `pk_test_…` → `pk_live_…` |
| `RESEND_API_KEY` | ✅ | ✅ | ✅ | ✅ | Dunning email delivery |
| `RESEND_WEBHOOK_SECRET` | ✅ | ✅ | ✅ | ✅ | Svix signing secret |
| `CRON_SECRET` | ✅ | ✅ | — | ✅ | Guards `/api/cron/*` (Vercel Cron sends it) |
| `MONITORING_URL` | ✅ | optional | — | — | Cron success ping (healthchecks.io etc.) |
| `DUNNING_FROM_EMAIL` / `_REPLY_TO` / `_SUPPORT_EMAIL` | ✅ | ✅ | ✅ | ✅ | Per-account overrides in Settings win |

**Rule of thumb:** anything `NEXT_PUBLIC_` is safe in the browser; everything
else is server-only and must never appear in client bundles.

---

## 2. Environments & branches

| Branch | Vercel env | Purpose |
|---|---|---|
| `main` | Production | Live site, production Supabase + Stripe |
| `staging` | Staging | Integration test bed; CI gates every PR |
| `feature/*` | Preview (auto) | One deployment per PR |

Promotion: **one phase = one PR → staging**; when verified, PR staging → main.

---

## 3. Deploy flow

```bash
# Daily dev (already scripted in DEV_FLOW.md)
git checkout -b feature/phase-NN-xxx
# … commit, push, PR → staging, CI green, merge

# Promote to production (after verifying on staging)
git checkout main && git pull
git merge --squash origin/staging
git commit -m 'release: promote staging to main'
git push origin main        # Vercel auto-deploys production
```

Vercel auto-deploys: preview per PR, staging per branch push, production per
`main` push. Nothing to babysit.

### Manual deploy (emergency)
```bash
vercel --prod
```

---

## 4. Monitoring

| Signal | Source | Alert when |
|---|---|---|
| Webhook dispatch failures | `audit_events` (`webhook.dispatch_failed`) | Any row in last 24h |
| Dunning send failures | `audit_events` (`dunning.send_failed`) | Any row in last 24h |
| Cron stopped | `MONITORING_URL` ping | No ping for 2 days |
| Site down | `GET /api/health` | Non-200 |
| Email bounces | `email_events` (`bounced`) | Rate climbing |

**Quick audit check (SQL, via Supabase dashboard):**
```sql
select action, count(*), max(created_at)
from audit_events
where created_at > now() - interval '1 day'
group by action order by 3 desc;
```

**Health probe:**
```bash
curl -s https://<your-domain>/api/health
# {"ok":true,"checks":{"env":true,"database":true},"ts":"…"}
```

---

## 5. Launch checklist (v0.2.0)

- [x] Pricing page live, $29/mo flat
- [ ] Stripe **test → live** keys in all three Vercel environments
  (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`)
- [ ] Recreate the platform webhook endpoint pointing at production
  `/api/webhooks/stripe` (new `whsec_…` in env)
- [ ] Resend: verify sending domain DNS (SPF + DKIM) for the dunning sender
- [ ] Smoke-test on production: Connect → first dunning email → card update →
  payment recovered → dashboard reflects it
- [ ] Confirm the cron fired: `MONITORING_URL` ping received + audit rows
- [ ] Tag the release: `git tag v0.2.0 && git push origin v0.2.0`

---

## 6. Common operations

### Rotate a Stripe webhook secret
1. Stripe dashboard → Webhooks → reveal/reset signing secret.
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel (all envs).
3. Redeploy `main` (`vercel --prod` or push empty commit).

### Onboard a merchant (support)
1. Merchant connects Stripe via Settings → Connect (OAuth).
2. Connect callback registers their webhook endpoint + backfills history.
3. First failed invoice triggers the dunning cron the next night.

### Investigate a payment that never recovered
1. `audit_events.dunning.send_failed` — send reason.
2. `email_events` for the failed payment id — was it sent/delivered/opened?
3. `recovery_tokens` — was the magic link ever minted/consumed?
4. Stripe dashboard invoice timeline for the final charge attempt.

---

## 7. Rollback

Vercel keeps every production deployment. To roll back:
1. Deployments tab → click the last known-good deployment → Promote to Production.
2. If the regression is a DB migration, do **not** revert data automatically —
   ship a corrective migration forward instead.
