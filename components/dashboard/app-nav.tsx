"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/settings", label: "Settings" },
] as const;

/**
 * Phase 19: dashboard nav with aria-current on the active route — server
 * layout can't know the pathname, so this lives in a client component.
 */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Dashboard">
      {LINKS.map((link) => {
        const active =
          link.href === "/dashboard"
            ? pathname === "/dashboard" || pathname.startsWith("/payments")
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              active
                ? "bg-surface-2 font-medium text-foreground"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <span className="mx-1 h-4 w-px bg-border-subtle" aria-hidden="true" />
      <SignOutButton />
    </nav>
  );
}
