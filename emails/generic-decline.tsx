import { Section, Text } from "@react-email/components";
import { EmailLayout } from "@/emails/components/email-layout";
import { CtaButton } from "@/emails/components/cta-button";

export interface GenericDeclineEmailProps {
  product: string;
  firstName: string | null;
  amount: string;
  date: string;
  updateUrl: string;
  supportEmail: string;
}

/**
 * Template 3 — generic decline (EMAIL_TEMPLATES.md).
 * Catch-all for card_declined, do_not_honor, processing_error,
 * restricted_card, approval_not_allowed and unknown codes. No false promises.
 */
export function GenericDeclineEmail({
  product,
  firstName,
  amount,
  date,
  updateUrl,
  supportEmail,
}: GenericDeclineEmailProps) {
  return (
    <EmailLayout
      product={product}
      preview="Your card was declined by your bank. Here's the fastest fix."
    >
      <Text style={greeting}>Hey {firstName ?? "there"},</Text>
      <Text style={body}>
        We had trouble charging <strong>{amount}</strong> for your {product}{" "}
        plan on {date} — the card on file was declined by your bank.
      </Text>
      <Text style={body}>
        This is often just a temporary block. The fastest fix is updating your
        payment method:
      </Text>

      <Section style={{ textAlign: "center" }}>
        <CtaButton href={updateUrl}>Update payment method</CtaButton>
      </Section>

      <Text style={body}>
        The moment you do, we&apos;ll charge your outstanding invoice and
        everything continues as normal.
      </Text>
      <Text style={body}>
        If it keeps failing, reply to this email or reach us at{" "}
        <a href={`mailto:${supportEmail}`} style={link}>
          {supportEmail}
        </a>{" "}
        and we&apos;ll sort it out with you.
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

const link = {
  color: "#1c7a3d",
};

const signoff = {
  color: "#33332f",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
};
