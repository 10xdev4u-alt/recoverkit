import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/components/email-layout";

export interface RecoveryConfirmationEmailProps {
  product: string;
  firstName: string | null;
  amount: string;
}

/**
 * Bonus template — recovery confirmation (EMAIL_TEMPLATES.md).
 * Sent when invoice.payment_succeeded fires after a recovery. No CTA needed;
 * converts a saved payment into goodwill and reduces churn anxiety.
 */
export function RecoveryConfirmationEmail({
  product,
  firstName,
  amount,
}: RecoveryConfirmationEmailProps) {
  return (
    <EmailLayout
      product={product}
      preview={`Your payment of ${amount} went through — thanks for keeping ${product} running.`}
    >
      <Text style={greeting}>Hey {firstName ?? "there"},</Text>
      <Text style={body}>
        Your payment of <strong>{amount}</strong> went through and your{" "}
        {product} subscription is fully active again. Thanks for the quick fix!
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
