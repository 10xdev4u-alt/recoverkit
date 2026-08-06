import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Phase 20: lightweight uptime/health endpoint for external monitoring
 * (UptimeRobot, Cronitor, Vercel Cron pings, etc.).
 *
 * - `GET /api/health` → 200 with component status when the core stack is up.
 * - No secrets are leaked: only booleans.
 */
export async function GET() {
  const supabase = createServerClient();

  const checks: Record<string, boolean> = {
    env: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    database: false,
  };

  if (supabase) {
    // Touch the DB without any real work — a failure surfaces as a 500.
    const { error } = await supabase
      .from("accounts")
      .select("id")
      .limit(1);
    checks.database = !error;
  }

  const ok = Object.values(checks).every(Boolean);
  return NextResponse.json(
    { ok, checks, ts: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
