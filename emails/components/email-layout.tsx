import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

/**
 * Shared white-label layout (docs/EMAIL_TEMPLATES.md §1).
 *
 * Emails come from the merchant ("Billing at {product}"), never from
 * RecoverKit. The layout is brand-agnostic: light, calm, one CTA, mobile-first.
 */
export interface EmailLayoutProps {
  product: string;
  preview: string;
  children: ReactNode;
}

export function EmailLayout({ product, preview, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{product}</Text>
          </Section>

          {children}

          <Hr style={rule} />
          <Section>
            <Text style={footer}>
              Questions? Reply to this email — a real human at {product} will
              help.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f6f6f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "32px 0",
  WebkitFontSmoothing: "antialiased",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e7e7e3",
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "40px 32px",
};

const header = {
  marginBottom: "24px",
};

const brand = {
  color: "#0b0b0c",
  fontSize: "18px",
  fontWeight: 700,
  letterSpacing: "-0.01em",
  margin: "0",
};

const rule = {
  borderColor: "#ecece8",
  margin: "28px 0 16px",
};

const footer = {
  color: "#6b6b72",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
};
