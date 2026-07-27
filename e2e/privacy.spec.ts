import { test, expect } from "@playwright/test";

// Privacy is the whole pitch (ADR 0011): the app must make no network calls to
// anywhere but its own origin — no CDN fonts, no analytics, no bank connection.
// This guards the self-hosted-font decision (ADR 0014) against a future CDN link.
test("loads without any request to an external origin", async ({
  page,
  baseURL,
}) => {
  const ownOrigin = new URL(baseURL!).origin;
  const external: string[] = [];

  page.on("request", (req) => {
    const origin = new URL(req.url()).origin;
    if (origin !== ownOrigin) external.push(req.url());
  });

  await page.goto("/");
  // Since #48, / is the redirect gate: a profile-less visitor lands on
  // /onboarding. Prove the app actually rendered (not a blank page that
  // trivially makes no calls) by waiting for that redirect to complete.
  await page.waitForURL("**/onboarding");
  await expect(
    page.getByRole("heading", { name: /onboarding/i }),
  ).toBeVisible();
  // Give any late-loading asset (e.g. a font) a beat to fire a request.
  await page.waitForLoadState("networkidle");

  expect(
    external,
    `unexpected external requests:\n${external.join("\n")}`,
  ).toEqual([]);
});
