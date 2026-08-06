"use client";

import { useState } from "react";

interface Props {
  defaults: {
    fromEmail: string;
    replyTo: string;
    supportEmail: string;
  };
}

export function EmailSettingsForm({ defaults }: Props) {
  const [fromEmail, setFromEmail] = useState(defaults.fromEmail);
  const [replyTo, setReplyTo] = useState(defaults.replyTo);
  const [supportEmail, setSupportEmail] = useState(defaults.supportEmail);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_email: fromEmail,
        reply_to: replyTo,
        support_email: supportEmail,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
    } else {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Could not save settings.");
    }
  }

  const inputCls =
    "mt-1.5 h-11 w-full rounded-xl border border-border-subtle bg-background px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="fromEmail" className="block text-sm font-medium">
          From address
        </label>
        <input
          id="fromEmail"
          type="email"
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="billing@yourstore.com"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-muted">
          Shown as “Billing at {fromEmail.split("@")[0] || "your store"} &lt;
          {fromEmail || "…"}&gt;”
        </p>
      </div>

      <div>
        <label htmlFor="replyTo" className="block text-sm font-medium">
          Reply-to
        </label>
        <input
          id="replyTo"
          type="email"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder="support@yourstore.com"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="supportEmail" className="block text-sm font-medium">
          Support email (shown in templates)
        </label>
        <input
          id="supportEmail"
          type="email"
          value={supportEmail}
          onChange={(e) => setSupportEmail(e.target.value)}
          placeholder="support@yourstore.com"
          className={inputCls}
        />
      </div>

      {error && (
        <p className="text-sm text-bad" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-good" role="status">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-background transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save email settings"}
      </button>
    </form>
  );
}
