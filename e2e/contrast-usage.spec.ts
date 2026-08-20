import { expect, test } from "@playwright/test";

/**
 * The contrast USAGE guard (#183).
 *
 * `src/styles/contrast.test.ts` guards the palette: it reads token values out
 * of `theme.css` and compares them. That is a real guard, and it is not this
 * one. It fires when a token MOVES and never when a token is USED somewhere it
 * should not be — so putting `text-accent` back on a `bg-card` surface
 * reintroduces a 3.09:1 pairing with all 45 of those tests still green. A duel
 * on #182 proved that by mutation, and #183 exists because the comment there
 * claimed otherwise.
 *
 * So this sweeps what the browser actually paints. Every text-bearing element
 * on every route, in both themes, measured foreground against its effective
 * background and checked against WCAG AA. It is a sweep rather than a list of
 * per-element assertions for the same reason `target-size.spec.ts` is: the
 * failures worth finding are the ones nobody thought to look for, and a
 * per-element test only ever covers what someone already suspected.
 *
 * **Why e2e and not the unit suite.** jsdom applies no stylesheet. A unit test
 * can see that an element carries `text-accent`, which is exactly the thing
 * that was already true and already useless — the class was always correct
 * while the colour it resolved to was invisible (ADR 0027). Only a browser
 * knows what `text-accent` on `bg-card` actually paints, and only a browser
 * resolves the ancestor chain that decides which background is behind the text.
 *
 * **What this does NOT cover, stated rather than left to assumption:**
 *
 * - **Hover, focus and active states.** ADR 0022's largest row is "every
 *   primary button hover" at 2.96:1, and it is not swept here. Measuring it
 *   means hovering each control and reading its colour mid-`transition-colors`
 *   — the values come back interpolated (`oklab(0.508867 …)`, a blend) and
 *   depend on when you look. Doing it honestly needs transitions defeated
 *   first, which is its own change. Static text only, for now.
 * - **Text over images or gradients.** There are none in this app; the
 *   background walk below assumes a solid colour and would need compositing
 *   otherwise.
 * - **Anything behind a viewport or interaction this fixture does not reach.**
 *   The four verdict badges are covered because the fixture deliberately
 *   produces all four kinds; a fifth kind would go unswept until added here.
 */

/** Savings 5000 against the prices below yields all four verdict kinds. */
const PROFILE = {
  schemaVersion: 1,
  profile: {
    currency: "EUR",
    salary: 2000,
    hoursPerWeek: 40,
    hoursPerDay: 8,
    paymentsPerYear: 12,
    expenses: 500,
    threshold: 10,
    savings: 5000,
    monthlyContribution: 0,
  },
};

/**
 * One goal per verdict kind, so every badge colour is on screen:
 * - 300 ≤ 5000 savings → `afford` (white on emerald-600).
 * - 26000 → remaining 21000, 14 months, extra 250 ≤ half of expenses →
 *   `cutToAfford` (the accent badge).
 * - 500000 → `cannot`. 900 → `stretch`.
 *
 * The `share` values put two of them in the Comparison so `/compare` renders
 * its populated state rather than its empty one.
 */
const GOALS = {
  schemaVersion: 1,
  goals: [
    {
      id: "g1",
      name: "Afford",
      price: 300,
      note: "n",
      createdAt: 1,
      share: 200,
    },
    { id: "g2", name: "Cut", price: 26000, note: "", createdAt: 2, share: 150 },
    { id: "g3", name: "Cannot", price: 500000, note: "", createdAt: 3 },
    { id: "g4", name: "Stretch", price: 900, note: "", createdAt: 4 },
  ],
};

const ROUTES = [
  "/goals",
  "/compare",
  "/settings",
  "/onboarding",
  "/no-such-page",
];

/**
 * The AA failures ADR 0022 case 4 decided to reproduce, and their measured
 * ratios as the browser paints them.
 *
 * This list is the point of the guard. Anything failing AA that is NOT here is
 * a new defect and fails the run; anything here that STOPS failing is a stale
 * entry and also fails the run, because a list of accepted failures that quietly
 * goes out of date is how the `--card` row came to name a site that no longer
 * existed (#183, and ADR 0022's note on that row).
 *
 * `ratio` is asserted within a tolerance, so a known failure getting *worse*
 * is caught too rather than waved through as "already failing".
 *
 * Note `--accent` as text on `--card` is deliberately absent: ADR 0027 moved
 * the goal card's caption off accent, and that pairing now has no live site.
 * If one reappears, this guard is what fails.
 */
type Accepted = {
  text: string;
  ratio: number;
  themes: ReadonlyArray<"light" | "dark">;
  why: string;
};

const ACCEPTED: readonly Accepted[] = [
  {
    text: "Before you buy",
    ratio: 2.96,
    themes: ["light"],
    why: "wizard kicker, `text-accent` on `--background` — ADR 0022 case 4, row 2",
  },
  {
    text: "Cut to afford",
    ratio: 2.96,
    themes: ["light"],
    why: "`--accent-foreground` on `--accent` — ADR 0022 case 4, row 1",
  },
  {
    text: "Afford",
    ratio: 3.65,
    themes: ["light", "dark"],
    why: "white on `emerald-600` — ADR 0022 case 4, row 4. Measured 3.65, not the 3.77 that row quotes: that figure is Tailwind v3's `#059669`, and this repo is on v4, which paints `oklch(0.596 0.145 163.225)` = `#009966`. Same failure, corrected number (#183).",
  },
];

/** One AA failure as the sweep found it. */
type Finding = {
  text: string;
  ratio: number;
  route: string;
  color: string;
  background: string;
  fontSize: number;
  fontWeight: number;
  floor: number;
};

/**
 * Walk every element that owns visible text and measure it.
 *
 * Runs inside the page: colours are resolved through a canvas rather than
 * parsed, because Chromium returns these tokens in their authored space
 * (`oklch(0.985 0.002 60)`, not `rgb(...)`) and a regex over the three numbers
 * feeds a hue angle in as a blue channel — a mistake made once already on
 * `threshold-flag.spec.ts` and not repeated here.
 */
function sweep(route: string) {
  return (r: string) => {
    const toPixel = (colour: string): [number, number, number] => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      // Paint white first: a translucent colour then composites over a known
      // backdrop instead of multiplying against an undefined one.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0] as number, d[1] as number, d[2] as number];
    };

    const luminance = ([red, green, blue]: [number, number, number]) => {
      const lin = (v: number) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * lin(red) + 0.7152 * lin(green) + 0.0722 * lin(blue);
    };

    const contrast = (
      a: [number, number, number],
      b: [number, number, number],
    ) => {
      const x = luminance(a);
      const y = luminance(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };

    /** The nearest ancestor that actually paints something behind this text. */
    const backgroundBehind = (el: Element): string => {
      let node: Element | null = el;
      while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        const parts = bg.match(/[\d.]+/g);
        const alpha =
          parts && parts.length > 3 ? parseFloat(parts[3] as string) : 1;
        // Anything near-opaque wins. Tints like `bg-accent/5` are skipped
        // rather than composited — they shift the result by well under the
        // tolerance here, and compositing them properly is its own job.
        if (parts && alpha > 0.9) return bg;
        node = node.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };

    const found: Finding[] = [];

    document.querySelectorAll("*").forEach((el) => {
      // Only the element that OWNS the text node, so a wrapper is not credited
      // with its child's contrast and measured twice.
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim();
      if (!own) return;

      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return;
      if (Number(cs.opacity) < 0.1) return;
      const box = (el as HTMLElement).getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return;

      const fontSize = parseFloat(cs.fontSize);
      const fontWeight = Number(cs.fontWeight) || 400;
      // WCAG 1.4.3: large text is 24px, or 18.66px when bold.
      const isLarge =
        fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const floor = isLarge ? 3 : 4.5;

      const background = backgroundBehind(el);
      const ratio = contrast(toPixel(cs.color), toPixel(background));

      if (ratio < floor) {
        found.push({
          text: own.slice(0, 40),
          ratio: Math.round(ratio * 100) / 100,
          route: r,
          color: cs.color,
          background,
          fontSize,
          fontWeight,
          floor,
        });
      }
    });

    return found;
  };
}

async function sweepTheme(
  page: import("@playwright/test").Page,
  theme: "light" | "dark",
): Promise<Finding[]> {
  await page.emulateMedia({ colorScheme: theme });
  const all: Finding[] = [];
  for (const route of ROUTES) {
    await page.goto(route);
    // The dashboard animates its meter in; settle before measuring.
    await page.waitForTimeout(250);
    if (theme === "dark") {
      await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
    }
    all.push(...(await page.evaluate(sweep(route), route)));
  }
  return all;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (d) => {
      window.localStorage.setItem("affordo.profile", JSON.stringify(d.p));
      window.localStorage.setItem("affordo.goals", JSON.stringify(d.g));
    },
    { p: PROFILE, g: GOALS },
  );
});

for (const theme of ["light", "dark"] as const) {
  test(`no unaccepted AA contrast failure in the ${theme} theme`, async ({
    page,
  }) => {
    const findings = await sweepTheme(page, theme);

    const accepted = ACCEPTED.filter((a) => a.themes.includes(theme));
    const unexpected = findings.filter(
      (f) => !accepted.some((a) => f.text === a.text),
    );

    expect(
      unexpected.map(
        (f) =>
          `${f.route} "${f.text}" ${f.ratio}:1 (needs ${f.floor}) — ${f.color} on ${f.background}`,
      ),
      "new AA contrast failures; if one is a deliberate reference reproduction, add it to ACCEPTED with its ADR row",
    ).toEqual([]);
  });

  test(`the accepted failures in the ${theme} theme are still exactly as recorded`, async ({
    page,
  }) => {
    const findings = await sweepTheme(page, theme);
    const accepted = ACCEPTED.filter((a) => a.themes.includes(theme));

    for (const entry of accepted) {
      const hit = findings.find((f) => f.text === entry.text);

      // A stale entry is a failure in its own right. The `--card` row in ADR
      // 0022 spent a release naming a site that no longer existed, and nothing
      // could tell — that is the mistake this assertion exists to prevent.
      expect(
        hit,
        `"${entry.text}" is recorded as an accepted AA failure (${entry.why}) but no longer fails in ${theme}. If it was fixed, delete the entry.`,
      ).toBeDefined();

      expect(
        hit?.ratio,
        `"${entry.text}" was recorded at ${entry.ratio}:1 and now measures ${hit?.ratio}:1`,
      ).toBeCloseTo(entry.ratio, 1);
    }
  });
}

test("the sweep can see the app at all", async ({ page }) => {
  // Without this every "no failures" assertion above is trivially true — the
  // exact shape of dead guard that #183 is about. If a routing change or a
  // hydration gate ever leaves these pages blank, this is what says so.
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/goals");
  await page.waitForTimeout(250);

  const measured = await page.evaluate(() => {
    let n = 0;
    document.querySelectorAll("*").forEach((el) => {
      const own = Array.from(el.childNodes)
        .filter((x) => x.nodeType === Node.TEXT_NODE)
        .map((x) => x.textContent ?? "")
        .join("")
        .trim();
      const box = (el as HTMLElement).getBoundingClientRect();
      if (own && box.width > 0 && box.height > 0) n += 1;
    });
    return n;
  });

  expect(measured).toBeGreaterThan(20);
});
