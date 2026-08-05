const steps = [
  {
    n: "01",
    title: "Connect Stripe",
    copy: "OAuth, five minutes, done. No CSV exports, no setup calls, no sales pitch first.",
  },
  {
    n: "02",
    title: "We chase the money",
    copy: "Decline-code-aware retry schedules and emails that sound human — “card expired” never gets treated like “insufficient funds”.",
  },
  {
    n: "03",
    title: "Proof, not promises",
    copy: "No-login card update links for your customers and a dashboard that shows exactly what we recovered this month.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-xl">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          How it works
        </p>
        <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Boring on purpose.
          <br />
          <span className="text-muted">Brutally effective.</span>
        </h2>
      </div>

      <div className="mt-14 grid gap-10 md:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={s.n}
            className="reveal group rounded-2xl border border-border-subtle bg-surface p-6 transition-colors hover:border-accent/40"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <p className="font-mono text-sm text-accent">{s.n}</p>
            <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
