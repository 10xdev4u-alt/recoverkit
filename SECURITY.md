# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Report privately:

- Use GitHub's **private vulnerability reporting** on this repository
  (Security → Report a vulnerability), or
- Open a private issue and mention the maintainers.

We'll acknowledge within 48 hours and coordinate a fix before disclosure.

## Scope

- Stripe keys, webhook secrets, magic-link tokens (card update page)
- Customer payment data flows
- Anything that could leak customer PII

## Response targets

- Triage: within 48 hours
- Fix + release for critical issues: within 7 days — we're a small team, thank
  you for your patience
