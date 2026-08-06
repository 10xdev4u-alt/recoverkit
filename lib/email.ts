import { render } from "@react-email/render";
import type { EmailTemplateKey } from "@/lib/decline-codes";
import { ExpiredCardEmail } from "@/emails/expired-card";
import { InsufficientFundsEmail } from "@/emails/insufficient-funds";
import { GenericDeclineEmail } from "@/emails/generic-decline";
import { RecoveryConfirmationEmail } from "@/emails/recovery-confirmation";

export { pickSubject } from "@/lib/subjects";

/**
 * Template registry (Phase 9). Maps the decline-family template keys
 * (docs/EMAIL_TEMPLATES.md) to their React Email components and HTML
 * rendering. Subjects live in lib/subjects.ts (pure, testable).
 */

export interface EmailContext {
  product: string;
  firstName: string | null;
  amount: string;
  date: string;
  updateUrl: string;
  supportEmail: string;
  /** Merchant-edited subject override (Phase 16); undefined = default. */
  customSubject?: string;
  /** Merchant-edited intro line override (Phase 16); undefined = default. */
  customIntro?: string;
}

export async function renderTemplate(
  key: EmailTemplateKey,
  ctx: EmailContext,
): Promise<string> {
  switch (key) {
    case "expired_card":
      return render(
        ExpiredCardEmail({
          product: ctx.product,
          firstName: ctx.firstName,
          amount: ctx.amount,
          date: ctx.date,
          updateUrl: ctx.updateUrl,
          supportEmail: ctx.supportEmail,
          customIntro: ctx.customIntro,
        }),
      );
    case "insufficient_funds":
      return render(
        InsufficientFundsEmail({
          product: ctx.product,
          firstName: ctx.firstName,
          amount: ctx.amount,
          date: ctx.date,
          updateUrl: ctx.updateUrl,
          customIntro: ctx.customIntro,
        }),
      );
    case "generic":
      return render(
        GenericDeclineEmail({
          product: ctx.product,
          firstName: ctx.firstName,
          amount: ctx.amount,
          date: ctx.date,
          updateUrl: ctx.updateUrl,
          supportEmail: ctx.supportEmail,
          customIntro: ctx.customIntro,
        }),
      );
  }
}

export async function renderRecoveryConfirmation(ctx: {
  product: string;
  firstName: string | null;
  amount: string;
}): Promise<string> {
  return render(
    RecoveryConfirmationEmail({
      product: ctx.product,
      firstName: ctx.firstName,
      amount: ctx.amount,
    }),
  );
}
