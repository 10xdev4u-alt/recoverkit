"use client";

import { useState } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ExpiredLink } from "@/components/recover/expired-link";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/**
 * Phase 12: the no-login card form. Fetches a SetupIntent client secret for
 * this token, confirms the card, then calls the finalize route which attaches
 * the payment method, pays open invoices and marks the link used.
 */
export function CardUpdateForm({ token }: { token: string }) {
  if (!stripePromise) {
    return (
      <ExpiredLink
        title="Card updates aren't available yet"
        message="RecoverKit is still finishing its setup. Your plan is safe — you'll get an email when card updates are live."
      />
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CardFormInner token={token} />
    </Elements>
  );
}

type Status =
  | { kind: "idle" }
  | { kind: "loading"; step: string }
  | { kind: "error"; message: string }
  | { kind: "done" };

function CardFormInner({ token }: { token: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const cardOptions = {
    style: {
      base: {
        color: "#f4f3ef",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "16px",
        "::placeholder": { color: "#9a9aa3" },
      },
      invalid: { color: "#f87171" },
    },
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setStatus({ kind: "loading", step: "Preparing…" });

    try {
      // 1. Mint a SetupIntent for this token.
      const setupRes = await fetch(`/api/recover/${token}/setup-intent`, {
        method: "POST",
      });
      if (!setupRes.ok) {
        const body = (await setupRes.json()) as { error?: string };
        setStatus({
          kind: "error",
          message: body.error ?? "Could not prepare the card form.",
        });
        return;
      }
      const { clientSecret } = (await setupRes.json()) as {
        clientSecret: string;
      };

      // 2. Collect the card.
      setStatus({ kind: "loading", step: "Saving your card…" });
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/recover/${token}`,
        },
        redirect: "if_required",
      });
      if (confirmError) {
        setStatus({
          kind: "error",
          message: friendlyCardError(confirmError.message),
        });
        return;
      }
      if (setupIntent.status !== "succeeded") {
        setStatus({
          kind: "error",
          message: "The card couldn't be verified. Try again or use another card.",
        });
        return;
      }

      // 3. Finalize: attach + pay open invoices + consume the token.
      setStatus({ kind: "loading", step: "Charging your outstanding balance…" });
      const finalizeRes = await fetch(`/api/recover/${token}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method_id: setupIntent.payment_method,
        }),
      });
      if (!finalizeRes.ok) {
        const body = (await finalizeRes.json()) as { error?: string };
        setStatus({
          kind: "error",
          message: body.error ?? "The card was saved but the charge needs a retry.",
        });
        return;
      }

      setStatus({ kind: "done" });
    } catch {
      setStatus({
        kind: "error",
        message: "Something went wrong. Please try again.",
      });
    }
  }

  if (status.kind === "done") {
    return (
      <div className="mt-8 rounded-2xl border border-good/30 bg-good/10 p-6 text-center">
        <p className="text-2xl" aria-hidden="true">
          ✅
        </p>
        <h2 className="mt-3 font-display text-xl font-medium">
          All sorted — thanks!
        </h2>
        <p className="mt-2 text-sm text-muted">
          Your new card is saved and the outstanding balance has been charged.
          Everything continues as normal.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-border-subtle bg-surface p-6">
      <label htmlFor="card-element" className="block text-sm font-medium">
        Card details
      </label>
      <div
        id="card-element"
        className="mt-3 rounded-xl border border-border-subtle bg-background px-4 py-3"
      >
        <CardElement options={cardOptions} />
      </div>

      {status.kind === "error" && (
        <p className="mt-3 text-sm text-bad" role="alert">
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || status.kind === "loading"}
        className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-background transition-all hover:bg-accent-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status.kind === "loading" ? status.step : "Save card & pay balance"}
      </button>

      <p className="mt-3 text-center text-xs text-muted">
        Secured by Stripe. We never see or store your card number.
      </p>
    </form>
  );
}

function friendlyCardError(message?: string): string {
  if (!message) return "The card was declined. Try again or use another card.";
  if (message.includes("expired")) {
    return "That card has expired — please use a card with a valid date.";
  }
  if (message.includes("insufficient")) {
    return "The card was declined for insufficient funds. Try another card.";
  }
  return message;
}
