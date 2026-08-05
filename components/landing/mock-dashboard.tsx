"use client";

import { useEffect, useState } from "react";

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const declines = [
  { code: "expired_card", label: "Expired card", recovered: 11, total: 14 },
  { code: "insufficient_funds", label: "Insufficient funds", recovered: 3, total: 9 },
  { code: "generic_decline", label: "Generic decline", recovered: 1, total: 6 },
];

const weekly = [180, 260, 340, 460];

export function MockDashboard() {
  const recovered = useCountUp(1240);

  return (
    <div
      role="img"
      aria-label="RecoverKit dashboard preview: $1,240 recovered this month"
      className="relative -rotate-1 rounded-2xl border border-border-subtle bg-surface shadow-[0_24px_80px_-24px_rgb(0_0_0/0.8)]"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-border-subtle" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-subtle" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-subtle" />
        <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          app.recoverkit.dev · Recovery
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            July 2026
          </p>
          <span className="rounded-full border border-border-subtle px-2 py-0.5 font-mono text-[10px] text-muted">
            Last 30 days
          </span>
        </div>

        {/* The money */}
        <div className="mt-4">
          <p className="text-sm text-muted">Recovered this month</p>
          <div className="mt-1 flex items-baseline gap-3">
            <p className="tnum font-display text-5xl font-semibold tracking-tight text-accent">
              ${recovered.toLocaleString()}
            </p>
            <noscript>
              <p className="tnum font-display text-5xl font-semibold tracking-tight text-accent">
                $1,240
              </p>
            </noscript>
            <span className="tnum font-mono text-xs text-good">
              +12.4% vs June
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { label: "Recovery rate", value: "41%" },
            { label: "At-risk MRR", value: "$3,280" },
            { label: "Open invoices", value: "12" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2.5"
            >
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
                {s.label}
              </p>
              <p className="tnum mt-1 text-lg font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Decline rows */}
        <div className="mt-5 space-y-2">
          {declines.map((d) => {
            const pct = Math.round((d.recovered / d.total) * 100);
            return (
              <div
                key={d.code}
                className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-2 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-good"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[11px] text-muted">
                    {d.code}
                  </span>
                </div>
                <span className="tnum text-xs text-muted">
                  <span className="text-foreground">{d.recovered}</span> /{" "}
                  {d.total} recovered · {pct}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Weekly bars */}
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Weekly recovered
          </p>
          <div className="mt-2 flex h-16 items-end gap-2">
            {weekly.map((w, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-accent/25 transition-colors hover:bg-accent/50"
                style={{ height: `${(w / 460) * 100}%` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border-subtle pt-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-good">
            ● Auto-recovery active
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Stripe connected
          </span>
        </div>
      </div>
    </div>
  );
}
