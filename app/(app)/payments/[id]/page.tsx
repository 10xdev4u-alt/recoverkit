import Link from "next/link";
import { notFound } from "next/navigation";
import { createUserClient } from "@/lib/supabase/ssr";
import { resolveAccount } from "@/lib/account";
import { DeclineBadge } from "@/components/dashboard/decline-badge";
import { formatAmount, formatDate } from "@/lib/dunning-helpers";

export const dynamic = "force-dynamic";

interface PaymentDetail {
  id: string;
  amount_due: number;
  status: string;
  decline_code: string | null;
  stripe_invoice_id: string | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
  customers: Array<{ id: string; email: string; account_id: string }> | null;
}

/**
 * Phase 15: "what happened to this payment?" in one screen — attempts,
 * emails sent, opens/clicks, and the recovery outcome.
 */
export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const account = await resolveAccount(supabase, user.id, user.email ?? undefined);
  if (!account) notFound();

  const { data: payment } = await supabase
    .from("failed_payments")
    .select(
      "id, amount_due, status, decline_code, stripe_invoice_id, attempt_count, next_payment_attempt, created_at, updated_at, customers!inner(id, email, account_id)",
    )
    .eq("id", id)
    .eq("customers.account_id", account.id)
    .maybeSingle();
  if (!payment) notFound();
  const detail = payment as unknown as PaymentDetail;
  const customerEmail = detail.customers?.[0]?.email ?? null;

  const { data: emailEvents } = await supabase
    .from("email_events")
    .select("id, event_type, template, created_at, payload")
    .eq("failed_payment_id", id)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Back to dashboard
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            Payment
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
            {formatAmount(detail.amount_due)}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <DeclineBadge code={detail.decline_code} />
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                detail.status === "open"
                  ? "bg-bad/10 text-bad"
                  : detail.status === "paid"
                    ? "bg-good/10 text-good"
                    : "bg-muted/10 text-muted"
              }`}
            >
              {detail.status}
            </span>
          </div>
        </div>
        <dl className="font-mono text-xs text-muted">
            <div className="flex gap-2">
              <dt>Customer</dt>
              <dd className="text-foreground">{customerEmail ?? "—"}</dd>
            </div>
            <div className="mt-1 flex gap-2">
              <dt>Attempts</dt>
              <dd className="text-foreground">{detail.attempt_count}</dd>
            </div>
            {detail.stripe_invoice_id && (
              <div className="mt-1 flex gap-2">
                <dt>Invoice</dt>
                <dd className="text-foreground">{detail.stripe_invoice_id}</dd>
              </div>
            )}
          </dl>
      </div>

      {/* Timeline */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-medium tracking-tight">
          Timeline
        </h2>
        <ol className="mt-4 space-y-0">
          <TimelineItem
            date={detail.created_at}
            title="Payment failed"
            detail={
              detail.decline_code
                ? `Declined: ${detail.decline_code}`
                : "The payment failed to complete."
            }
            first
          />

          {(emailEvents ?? []).map((ev) => (
            <TimelineItem
              key={ev.id}
              date={ev.created_at}
              title={eventLabel(ev.event_type)}
              detail={
                ev.event_type === "clicked"
                  ? `Clicked the update link${
                      ev.payload?.click?.url ? ` (${ev.payload.click.url})` : ""
                    }`
                  : ev.template
                    ? `Template: ${ev.template}`
                    : undefined
              }
            />
          ))}

          {(emailEvents ?? []).length === 0 && detail.status === "open" && (
            <li className="relative flex gap-4 pb-8">
              <div className="flex flex-col items-center">
                <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-muted/40" aria-hidden="true" />
                <span className="w-px flex-1 bg-border-subtle" aria-hidden="true" />
              </div>
              <div className="pb-1">
                <p className="text-sm font-semibold">Awaiting first dunning email</p>
                <p className="mt-0.5 text-sm text-muted">
                  RecoverKit will reach out to this customer on its next
                  scheduled run.
                </p>
              </div>
            </li>
          )}

          <TimelineItem
            date={detail.updated_at}
            title={
              detail.status === "paid"
                ? "Payment recovered"
                : detail.status === "void"
                  ? "Marked void"
                  : detail.status === "uncollectible"
                    ? "Marked uncollectible"
                    : "Still in progress"
            }
            last
          />
        </ol>
      </section>

      <p className="mt-8 text-xs text-muted">
        Invoice {detail.stripe_invoice_id ?? "—"} · last updated{" "}
        {formatDate(detail.updated_at)}
      </p>
    </main>
  );
}

function TimelineItem({
  date,
  title,
  detail,
  first,
  last,
}: {
  date: string;
  title: string;
  detail?: string;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <span
          className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
            last ? "bg-accent" : "bg-muted/40"
          }`}
          aria-hidden="true"
        />
        {!last && (
          <span className="w-px flex-1 bg-border-subtle" aria-hidden="true" />
        )}
      </div>
      <div className="pb-1">
        <p className="text-sm font-semibold">{title}</p>
        {detail && <p className="mt-0.5 text-sm text-muted">{detail}</p>}
        <p className="mt-1 font-mono text-xs text-muted">
          {formatDate(date)}
          {first ? " · first failure" : ""}
        </p>
      </div>
    </li>
  );
}

function eventLabel(eventType: string): string {
  switch (eventType) {
    case "sent":
      return "Dunning email sent";
    case "delivered":
      return "Email delivered";
    case "opened":
      return "Email opened";
    case "clicked":
      return "Update link clicked";
    case "bounced":
      return "Email bounced";
    default:
      return eventType;
  }
}
