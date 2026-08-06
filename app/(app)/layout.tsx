import Link from "next/link";
import { createUserClient } from "@/lib/supabase/ssr";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/dashboard/app-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Not configured (e.g. CI): there are no sessions to serve — bounce to
  // sign-in instead of crashing on client creation.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/sign-in");
  }

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
          <AppNav />
        </div>
      </header>
      {children}
    </div>
  );
}
