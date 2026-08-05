import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = new Set(["landing", "hero", "pricing"]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? (body as { email?: unknown }).email
      : undefined;

  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";

  // RFC 5321 max address length is 254; cap here to keep the DB tight.
  if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const source =
    typeof body === "object" && body !== null && "source" in body
      ? (body as { source?: unknown }).source
      : undefined;
  const normalizedSource =
    typeof source === "string" && SOURCES.has(source) ? source : "landing";

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Waitlist is not configured yet" },
      { status: 503 },
    );
  }

  const { error } = await supabase
    .from("waitlist_signups")
    .insert({ email: normalized, source: normalizedSource })
    .select("id")
    .single();

  // Unique-violation (23505) means the email is already on the list —
  // treat as success so re-submits are idempotent.
  if (error && error.code !== "23505") {
    return NextResponse.json(
      { error: "Could not save your signup" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
