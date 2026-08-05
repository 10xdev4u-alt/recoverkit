export function Footer() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <p className="flex items-center gap-2.5">
          <svg
            width="18"
            height="18"
            viewBox="0 0 64 64"
            aria-hidden="true"
            className="text-accent"
          >
            <path
              d="M18 34a14 14 0 1 1 4.1-9.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M18 14v11h11"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-display text-sm font-semibold">RecoverKit</span>
          <span className="text-xs text-muted">
            — failed payment recovery that pays for itself.
          </span>
        </p>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          © 2026 RecoverKit · MIT licensed · made for indie SaaS
        </p>
      </div>
    </footer>
  );
}
