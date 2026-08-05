const stats = [
  {
    value: "20–40%",
    label: "of SaaS churn is failed cards — not canceled plans",
    source: "Baremetrics · Recurly",
  },
  {
    value: "1 in 3",
    label: "failed payments stay unrecovered after Stripe's own retries",
    source: "Independent audits",
  },
  {
    value: "$0",
    label: "of that money is coming back on its own — unless someone chases it",
    source: "That's the job",
  },
];

export function ProblemStrip() {
  return (
    <section id="problem" className="border-y border-border-subtle bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:grid-cols-3">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="reveal"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <p className="tnum font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {s.value}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              {s.label}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted/60">
              {s.source}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
