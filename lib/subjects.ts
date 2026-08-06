import type { EmailTemplateKey } from "@/lib/decline-codes";

/**
 * Subject lines per template key (approved copy from docs/EMAIL_TEMPLATES.md).
 * Kept in a pure module so unit tests never need to parse JSX templates.
 */
export function pickSubject(key: EmailTemplateKey, product: string): string {
  switch (key) {
    case "expired_card":
      return `Your card on file expired — quick fix for ${product}`;
    case "insufficient_funds":
      return `Your payment didn't go through — ${product}`;
    case "generic":
      return `We couldn't process your payment — ${product}`;
  }
}
