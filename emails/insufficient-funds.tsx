import { Section, Text } from "@react-email/components";
import { EmailLayout } from "@/emails/components/email-layout";
import { CtaButton } from "@/emails/components/cta-button";

export interface InsufficientFundsEmailProps {
  product: string;
  firstName: string | null;
  amount: string;
  date: string;
  updateUrl: string;
}

/**
 * Template 2 — insufficient_funds (EMAIL_TEMPLATES.md).
 * Softer than Template 1 — this is temporary, not a wrong-card problem.
 * Both retry and card update route to the same recovery page.
 */
export function InsufficientFundsEmail({
  product,
  firstName,
  amount,
  date,
  updateUrl,
}: InsufficientFundsEmailProps) {
  return (
    <EmailLayout
      product={product}
      preview="Happens all the time. Here's what to do (30 seconds)."
    >
      <Text style={greeting}>Hey {firstName ?? "there"},</Text>
      <Text style={body}>
        We tried to charge <strong>{amount}</strong> for your {product} plan on{" "}
        {date}, but the card on file didn&apos;t have enough available funds at
        the time.
      </Text>
      <Text style={body}>
        No stress — this happens all the time. Two easy options:
      </Text>

      <Section style={{ textAlign: "center" }}>
        <CtaButton href={updateUrl}>Try again or update your card</CtaButton>
      </Section>

      <Text style={body}>
        We&apos;ll also retry automatically over the next few days, so if you
        top up your account, you&apos;re already covered.
      </Text>
      <Text style={body}>Questions? Just reply to this email.</Text>
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
