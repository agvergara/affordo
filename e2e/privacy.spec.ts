import { test, expect } from "@playwright/test";

// Privacy is the whole pitch (ADR 0011): the app must make no network calls to
// anywhere but its own origin — no CDN fonts, no bank connection. This guards
// the self-hosted-font decision (ADR 0014) against a future CDN link.
//
// This comment used to end "no analytics", and that clause is now false: #160
// added Vercel Web Analytics and Speed Insights (ADR 0025). It is called out
// rather than quietly deleted because the clause cost nothing to leave in — the
// beacons are same-origin (`/_vercel/…`), so this test would have kept passing
// while the thing it named shipped. A test that advertises coverage it does not
// have is the failure the working agreements' rule 5 exists to catch, and it
// nearly happened here.
//
// What this test still proves: no THIRD-PARTY origin. What it never proved, and
// now must, is that nothing sensitive goes out — see the test below it.
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
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  // Give any late-loading asset (e.g. a font) a beat to fire a request.
  await page.waitForLoadState("networkidle");

  expect(
    external,
    `unexpected external requests:\n${external.join("\n")}`,
  ).toEqual([]);
});

/**
 * What the origin check above cannot see (#160, ADR 0025).
 *
 * Analytics narrowed an absolute "nothing goes out" to "nothing SENSITIVE goes
 * out", so the narrower claim needs its own guard — otherwise the promise rests
 * on nobody having passed the wrong value to a beacon yet.
 *
 * The profile below is deliberately absurd. Real-looking figures (2000, 500)
 * collide with widths, timings, cache-busting integers and version numbers, so
 * a needle hunt on them would fail for reasons that have nothing to do with
 * privacy. These digits appear nowhere else in a request by accident.
 *
 * The beacon assertion is not decoration: without it this test passes just as
 * happily with analytics ripped out entirely, which would make it prove nothing
 * about the case it exists for. `/_vercel/insights/script.js` 404s under `vite
 * preview` — there is no Vercel runtime here — but the REQUEST is what is being
 * pinned, and it fires either way.
 */
test("the Vercel beacons are same-origin and carry no financial value", async ({
  page,
  baseURL,
}) => {
  const salary = 133337;
  const savings = 424242;
  const price = 987654;
  const expenses = 24681;
  const contribution = 1357;
  // The Share is financial data the user typed, exactly like the rest (#155).
  const share = 31415;
  const goalName = "Zzyzx Telescope";
  const note = "Nqxlptrz";

  await page.addInitScript(
    ([
      salary,
      savings,
      price,
      expenses,
      contribution,
      share,
      goalName,
      note,
    ]) => {
      window.localStorage.setItem(
        "affordo.profile",
        JSON.stringify({
          schemaVersion: 1,
          profile: {
            currency: "EUR",
            salary,
            hoursPerWeek: 40,
            hoursPerDay: 8,
            paymentsPerYear: 12,
            expenses,
            threshold: 10,
            savings,
            monthlyContribution: contribution,
          },
        }),
      );
      window.localStorage.setItem(
        "affordo.goals",
        JSON.stringify({
          schemaVersion: 1,
          goals: [
            {
              id: "g-1",
              name: goalName,
              price,
              note,
              share,
              createdAt: 1700000000000,
            },
          ],
        }),
      );
    },
    [
      salary,
      savings,
      price,
      expenses,
      contribution,
      share,
      goalName,
      note,
    ] as const,
  );

  const ownOrigin = new URL(baseURL!).origin;
  const seen: string[] = [];
  page.on("request", (req) => {
    seen.push(`${req.url()}\n${req.postData() ?? ""}`);
  });

  for (const path of ["/goals", "/compare", "/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }

  // The seed actually reached the screen. Without this the whole test goes
  // vacuous the day the stored shape changes: an invalid profile redirects to
  // /onboarding, which renders no financial value at all, and every assertion
  // below then passes by having nothing to find.
  await page.goto("/goals");
  await expect(page.getByText(goalName)).toBeVisible();
  await page.waitForLoadState("networkidle");

  // The feature is actually wired, and to our own origin.
  const beacons = seen.filter((entry) => entry.includes("/_vercel/"));
  expect(
    beacons.length,
    "no /_vercel/ request — are the beacons mounted?",
  ).toBeGreaterThan(0);
  for (const beacon of beacons) {
    expect(new URL(beacon.split("\n")[0]).origin).toBe(ownOrigin);
  }

  // Everything the app hands to analytics, whether or not it can be sent.
  //
  // The network is the wrong place to look for a leak here, and believing
  // otherwise is how this test shipped useless the first time. Under `vite
  // preview` both `/_vercel/*/script.js` 404, so no beacon ever POSTs — the
  // libraries fall back to a queue stub (`window.va` pushes to `vaq`,
  // `window.si` to `siq`) and hold everything there. A request-body sweep sees
  // documents, static assets and two 404s, so a genuine `track()` leak passes
  // it untouched.
  //
  // Those queues ARE the complete leak surface: pageviews and events alike go
  // through `window.va(...)` before any transport exists. Reading them proves
  // what the app handed over, which is the thing we actually control, and it
  // holds whether or not the beacons are reachable.
  const queued = await page.evaluate(() =>
    JSON.stringify([
      (window as unknown as { vaq?: unknown[] }).vaq ?? [],
      (window as unknown as { siq?: unknown[] }).siq ?? [],
    ]),
  );

  // Derived from the seeded values, never hand-copied — a transcribed literal
  // silently stops matching the day the seed above is edited.
  const needles = [salary, savings, price, expenses, contribution, share]
    .map(String)
    .concat(goalName, note);

  const haystacks = [...seen, `analytics queue: ${queued}`];
  for (const needle of needles) {
    const leaks = haystacks.filter((entry) => entry.includes(needle));
    expect(leaks, `"${needle}" appeared in:\n${leaks.join("\n---\n")}`).toEqual(
      [],
    );
  }
});

/**
 * The inline title script (#129) is a build-time transform, so the unit suite
 * that reads the *source* `index.html` cannot see it. This pins the end result
 * against a real build: the tab carries the route's title, not the root one.
 */
test("each route's title is correct in the shipped build", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "affordo.profile",
      JSON.stringify({
        schemaVersion: 1,
        profile: {
          currency: "EUR",
          salary: 2000,
          hoursPerWeek: 40,
          hoursPerDay: 8,
          paymentsPerYear: 12,
          expenses: 500,
          threshold: 10,
          savings: 0,
          monthlyContribution: 0,
        },
      }),
    );
  });
  for (const [path, title] of [
    ["/goals", "Goals · Affordo"],
    ["/settings", "Settings · Affordo"],
    ["/onboarding", "Set up · Affordo"],
  ] as const) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
  }
});
