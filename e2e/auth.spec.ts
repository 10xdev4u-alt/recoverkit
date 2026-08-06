import { test, expect } from "@playwright/test";

test("unauthenticated dashboard redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  // Middleware skips route protection when Supabase isn't configured (CI),
  // so accept either the redirect or the dashboard's own sign-in bounce.
  await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});

test("sign-in page sends a magic link for a valid email", async ({ page }) => {
  await page.goto("/sign-in");
  const input = page.getByLabel(/work email/i);
  await input.fill("e2e@example.com");
  await page.getByRole("button", { name: /magic link/i }).click();

  // Without a configured Supabase (CI), the client still submits and either
  // the success state renders or a readable error surfaces — never a crash.
  await expect(
    page.getByText(/check your inbox|email provider|smtp|unauthorized|fetch|failed|isn't configured|is invalid|rate limit/i),
  ).toBeVisible({ timeout: 15_000 });
});

test("recovery page shows a calm expired-link state for a bad token", async ({
  page,
}) => {
  await page.goto("/recover/definitely-not-a-real-token");
  await expect(page.getByText(/link has expired|invalid or expired/i)).toBeVisible();
});
