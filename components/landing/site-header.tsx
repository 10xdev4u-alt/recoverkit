import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <svg
            width="22"
            height="22"
            viewBox="0 0 64 64"
            aria-hidden="true"
            className="text-accent"
          >
            <rect width="64" height="64" rx="14" fill="currentColor" opacity="0.12" />
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
          <span className="font-display text-lg font-semibold tracking-tight">
            RecoverKit
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a
            href="#problem"
            className="transition-colors hover:text-foreground"
          >
            Why
          </a>
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a
            href="#pricing"
            className="transition-colors hover:text-foreground"
          >
            Pricing
          </a>
        </nav>

        <a
          href="#waitlist"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background transition-all hover:bg-accent-strong hover:shadow-[0_0_24px_rgb(198_242_78/0.35)]"
        >
          Join the waitlist
        </a>
      </div>
    </header>
  );
}
