import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RecoverKit — failed payment recovery for indie SaaS",
  description:
    "Flat $29/mo Stripe dunning: decline-code-aware emails, no-login card updates, and a dashboard that shows exactly how much MRR you saved.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} bg-background font-sans text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
