import { Button } from "@react-email/components";

/**
 * Single CTA per email (EMAIL_TEMPLATES.md §2) — above the fold, mobile-first.
 * The color echoes the RecoverKit money-green while staying neutral enough for
 * any merchant's brand.
 */
export function CtaButton({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Button href={href} style={button}>
      {children}
    </Button>
  );
}

const button = {
  backgroundColor: "#1c7a3d",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: "20px",
  margin: "20px 0 8px",
  padding: "12px 24px",
  textDecoration: "none",
};
