"use client";

import { useState } from "react";
import type { TemplateOverrides } from "@/lib/template-store";

const TEMPLATES = [
  {
    key: "expired_card",
    title: "Expired card",
    description: "Card on file expired — update needed.",
    defaultSubject: "Your card on file expired — quick fix for {product}",
  },
  {
    key: "insufficient_funds",
    title: "Insufficient funds",
    description: "Top-up or update card. Sent 24-48h after failure.",
    defaultSubject: "Your payment didn't go through — {product}",
  },
  {
    key: "generic",
    title: "Generic decline",
    description: "Bank declined — card update or retry.",
    defaultSubject: "We couldn't process your payment — {product}",
  },
] as const;

export function TemplateEditor({
  overrides,
}: {
  overrides: TemplateOverrides;
}) {
  const [drafts, setDrafts] = useState<
    Record<string, { subject: string; body: string }>
  >(
    Object.fromEntries(
      TEMPLATES.map((t) => [
        t.key,
        {
          subject: overrides[t.key]?.subject ?? "",
          body: overrides[t.key]?.body ?? "",
        },
      ]),
    ),
  );
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function handleSave(key: string) {
    const draft = drafts[key];
    setSavedKey(null);
    setSavingKey(key);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: { key, subject: draft.subject, body: draft.body },
      }),
    });
    setSavingKey(null);
    if (res.ok) setSavedKey(key);
  }

  function previewHref(key: string): string {
    const draft = drafts[key];
    const params = new URLSearchParams();
    if (draft.subject) params.set("subject", draft.subject);
    if (draft.body) params.set("intro", draft.body);
    const qs = params.toString();
    return `/api/emails/${key}/preview${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      {TEMPLATES.map((t) => {
        const draft = drafts[t.key];
        return (
          <div
            key={t.key}
            className="rounded-2xl border border-border-subtle bg-surface p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <p className="text-xs text-muted">{t.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewHref(t.key)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
                >
                  Preview
                </a>
                <button
                  onClick={() => handleSave(t.key)}
                  disabled={savingKey !== null}
                  className="rounded-full border border-border-subtle px-4 py-1.5 text-xs font-semibold transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savedKey === t.key ? "Saved ✓" : savingKey === t.key ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor={`subject-${t.key}`}
                  className="block text-xs font-medium text-muted"
                >
                  Subject (empty = default)
                </label>
                <input
                  id={`subject-${t.key}`}
                  type="text"
                  value={draft.subject}
                  onChange={(e) =>
                    setDrafts((d) => ({
                      ...d,
                      [t.key]: { ...d[t.key], subject: e.target.value },
                    }))
                  }
                  placeholder={t.defaultSubject}
                  className="mt-1.5 h-10 w-full rounded-xl border border-border-subtle bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor={`body-${t.key}`}
                  className="block text-xs font-medium text-muted"
                >
                  Intro line (empty = default)
                </label>
                <textarea
                  id={`body-${t.key}`}
                  rows={2}
                  value={draft.body}
                  onChange={(e) =>
                    setDrafts((d) => ({
                      ...d,
                      [t.key]: { ...d[t.key], body: e.target.value },
                    }))
                  }
                  placeholder="We tried to charge {amount} but…"
                  className="mt-1.5 w-full resize-none rounded-xl border border-border-subtle bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
