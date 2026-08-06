/**
 * Pure dunning helpers (Phase 10). No JSX, no email-template imports — kept
 * separate so unit tests never need to parse .tsx files.
 */

export function formatAmount(cents: number): string {
  const dollars = (cents / 100).toFixed(2);
  return `$${Number(dollars).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildUpdateUrl(appUrl: string, rawToken: string): string {
  return `${appUrl.replace(/\/$/, "")}/recover/${rawToken}`;
}

export const NUDGE_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h (EMAIL_TEMPLATES §10)

export interface DunningState {
  lastSentAt: string | null;
  hasClicked: boolean;
}

/**
 * A payment is due a nudge when its most recent dunning email was sent more
 * than 48h ago and the update link was never clicked (no 'clicked' event
 * recorded on any of its emails).
 */
export function isNudgeDue(
  state: DunningState,
  now: Date = new Date(),
): boolean {
  if (!state.lastSentAt || state.hasClicked) return false;
  return now.getTime() - new Date(state.lastSentAt).getTime() >= NUDGE_WINDOW_MS;
}
