import { test, expect } from "@playwright/test";

test("landing page renders the pitch and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/RecoverKit/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});

test("waitlist form rejects an invalid email client-side", async ({ page }) => {
  await page.goto("/");
  const input = page.getByPlaceholder("you@yourstartup.com").first();
  await input.fill("not-an-email");
  await input.press("Enter");
  await expect(page.getByText(/doesn't look right/).first()).toBeVisible();
});

test("waitlist form accepts a valid email (server configured or graceful)", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByPlaceholder("you@yourstartup.com").first();
  await input.fill("e2e-test@example.com");
  await input.press("Enter");

  // Either the signup succeeds (env configured) or it degrades gracefully
  // with a readable server-error — never a crash.
  await expect(page.getByText(/You're on the list|Couldn't reach the signup service/).first()).toBeVisible({
    timeout: 10_000,
  });
});
