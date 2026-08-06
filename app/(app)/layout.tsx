import Link from "next/link";
import { createUserClient } from "@/lib/supabase/ssr";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-subtle">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/dashboard" className="font-display text-sm font-bold tracking-tight">
            RecoverKit
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              Overview
            </Link>
            <Link
              href="/settings"
              className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              Settings
            </Link>
            <span className="mx-1 h-4 w-px bg-border-subtle" aria-hidden="true" />
            <SignOutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
