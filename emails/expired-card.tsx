import { Section, Text } from "@react-email/components";
import { EmailLayout } from "@/emails/components/email-layout";
import { CtaButton } from "@/emails/components/cta-button";

export interface ExpiredCardEmailProps {
  product: string;
  firstName: string | null;
  amount: string;
  date: string;
  updateUrl: string;
  supportEmail: string;
  /** Merchant-edited intro override (Phase 16). */
  customIntro?: string;
}

/**
 * Template 1 — expired_card (EMAIL_TEMPLATES.md).
 * The highest-converting code: the fix is unambiguous, so keep it short and
 * make the action feel trivial. Send immediately.
 */
export function ExpiredCardEmail({
  product,
  firstName,
  amount,
  date,
  updateUrl,
  customIntro,
}: ExpiredCardEmailProps) {
  return (
    <EmailLayout
      product={product}
      preview="It takes 30 seconds, and nothing about your plan changes."
    >
      <Text style={greeting}>Hey {firstName ?? "there"},</Text>
      {customIntro ? (
        <Text style={body}>{customIntro}</Text>
      ) : (
        <Text style={body}>
          We tried to charge <strong>{amount}</strong> for your {product} plan on{" "}
          {date}, but the card we have on file has expired.
        </Text>
      )}
      <Text style={body}>It takes about 30 seconds to fix:</Text>

      <Section style={{ textAlign: "center" }}>
        <CtaButton href={updateUrl}>Update payment method</CtaButton>
      </Section>

      <Text style={body}>
        Nothing about your plan or access changes. We&apos;ll take care of the
        rest.
      </Text>
      <Text style={body}>
        Questions? Just reply to this email.
      </Text>
      <Text style={signoff}>— The {product} team</Text>
    </EmailLayout>
  );
}

const greeting = {
  color: "#111110",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const body = {
  color: "#33332f",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const signoff = {
  color: "#33332f",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
};
