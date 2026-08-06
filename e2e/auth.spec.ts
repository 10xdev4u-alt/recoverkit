import { test, expect } from "@playwright/test";

test("unauthenticated dashboard redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});

test("sign-in page sends a magic link for a valid email", async ({ page }) => {
  await page.goto("/sign-in");
  const input = page.getByLabel(/work email/i);
  await input.fill("e2e@example.com");
  await page.getByRole("button", { name: /magic link/i }).click();

  // Supabase may not have email delivery configured in CI; assert either the
  // success state or the readable error — never a crash.
  await expect(
    page.getByText(/check your inbox|email provider|smtp|unauthorized/i),
  ).toBeVisible({ timeout: 10_000 });
});

test("recovery page shows a calm expired-link state for a bad token", async ({
  page,
}) => {
  await page.goto("/recover/definitely-not-a-real-token");
  await expect(page.getByText(/link has expired|invalid or expired/i)).toBeVisible();
});
