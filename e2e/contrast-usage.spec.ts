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
 * - **Anything painted behind an element without being its ANCESTOR.** The
 *   backdrop is resolved by walking up the DOM, so content scrolled under the
 *   sticky translucent header is invisible to it: visually behind the bar,
 *   nowhere in its ancestor chain. Measured — scrolling to y=600 leaves the
 *   resolved backdrop unchanged. Harmless today because the bar's colour equals
 *   the page's, so nothing shows through; a real gap if either ever changes.
 * - **Anything behind a viewport or interaction this fixture does not reach.**
 *   The four verdict badges are covered because the fixture deliberately
 *   produces all four kinds; a fifth kind would go unswept until added here.
 *   The goal dialog is the concrete case: it opens on a click, so nothing in it
 *   is measured.
 * - **`<option>` text.** The sweep measures a `<select>`'s displayed value and
 *   its placeholder, then stops. Options are painted by browser chrome rather
 *   than author CSS, so there is little to enforce, but it is a gap rather than
 *   a decision.
 *
 * Two shapes the model could plausibly get wrong were probed against actual
 * painted pixels rather than reasoned about:
 *
 * - **Nested opacity groups.** `opacity:0.5` inside `opacity:0.5` over white:
 *   the multiplicative walk gives alpha 0.25 → grey 191, and a screenshot of
 *   the block reads `191,191,191`. Exact.
 * - **A backdrop on `body`.** Exercised live by the two footer entries below,
 *   whose backdrop IS the page; a duel reviewer independently measured them at
 *   `rgb(130,129,129)` on `rgb(251,250,249)` = 3.74:1, matching this sweep.
 *
 * Four other escape routes were checked and do NOT apply to this app, so they
 * are named here to save the next reader the search: there is no
 * pseudo-element text content, no SVG `<text>` (the one `<text` match is
 * `<textarea>`, which IS swept as a form control), no shadow DOM, and no
 * infinite animation for `settle()` to hang on — both keyframes are finite
 * (0.5s and 0.7s, `both`). Any of these appearing later would need the sweep
 * extended.
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
 *
 * The names are deliberately NOT the verdict words. A goal named "Afford"
 * renders the same string as the afford badge, and an `ACCEPTED` entry keyed on
 * that string would absorb a real failure on the goal name instead of the badge
 * — a trap the duel on #184 demonstrated. Route scoping alone does not fix it,
 * because both render on `/goals`.
 */
const GOALS = {
  schemaVersion: 1,
  goals: [
    {
      id: "g1",
      name: "Laptop",
      price: 300,
      note: "n",
      createdAt: 1,
      share: 200,
    },
    {
      id: "g2",
      name: "Kitchen",
      price: 26000,
      note: "",
      createdAt: 2,
      share: 150,
    },
    { id: "g3", name: "Villa", price: 500000, note: "", createdAt: 3 },
    { id: "g4", name: "Bicycle", price: 900, note: "", createdAt: 4 },
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
  /**
   * A CSS selector the element must sit inside.
   *
   * Text and route were not enough, and adding the ratio did not help either:
   * the footer wordmark and the header wordmark are BOTH "Affordo", both on
   * the same routes, and when the header is dimmed they fail at exactly the
   * same 3.74:1 — so the ratio could not separate them and the round-2 fix was
   * inert for the mutation it claimed to catch (#184 duel, round 3).
   *
   * A structural scope does separate them, because they are genuinely
   * different places rather than different numbers.
   */
  within: string;
  /** Routes this is accepted on. Unscoped matching let one entry absorb a
   *  different element's failure elsewhere (#184 duel), so it is explicit. */
  routes: readonly string[];
  ratio: number;
  themes: ReadonlyArray<"light" | "dark">;
  why: string;
};

const ACCEPTED: readonly Accepted[] = [
  {
    text: "Before you buy",
    // `main`, not `body`. Every element matches `body`, so using it as a scope
    // is the same as having no scope — measured: this element's ancestors are
    // exactly [main, body], and the header wordmark's are [nav, body], which is
    // what makes footer/nav a real discriminator and body a useless one.
    within: "main",
    routes: ["/onboarding"],
    ratio: 2.96,
    themes: ["light"],
    why: "wizard kicker, `text-accent` on `--background` — ADR 0022 case 4, row 2",
  },
  {
    text: "Cut to afford",
    within: "article",
    routes: ["/goals"],
    ratio: 2.96,
    themes: ["light"],
    why: "`--accent-foreground` on `--accent` — ADR 0022 case 4, row 1",
  },
  {
    text: "Afford",
    within: "article",
    routes: ["/goals"],
    ratio: 3.65,
    themes: ["light", "dark"],
    why: "white on `emerald-600` — ADR 0022 case 4, row 4. Measured 3.65, not the 3.77 that row quotes: that figure is Tailwind v3's `#059669`, and this repo is on v4, which paints `oklch(0.596 0.145 163.225)` = `#009966`. Same failure, corrected number (#183).",
  },
  // The two below are NOT in ADR 0022's case-4 table, which says the palette
  // "fails WCAG AA in four places". That count was taken before anything
  // measured painted opacity, and it is wrong: the dashboard footer is wrapped
  // in `opacity-50`, so its 10px text lands at 3.74:1 while its own computed
  // colour reads a perfectly legible 19.32:1. Nothing could see this until the
  // sweep composited ancestor opacity (#184 duel).
  //
  // Accepted on the same grounds as the rest of case 4: the `opacity-50` is the
  // reference's own, extracted to close #104 after a duel wrongly called it an
  // invention. Reproduced, therefore shipped, therefore recorded here.
  {
    text: "Record persistent in local-cache",
    within: "footer",
    routes: ["/goals", "/compare"],
    ratio: 3.74,
    themes: ["light"],
    why: "dashboard footer under the reference's own `opacity-50` (#104) — not in ADR 0022's case-4 table, found by this sweep (#183/#184)",
  },
  {
    text: "Affordo",
    within: "footer",
    routes: ["/goals", "/compare"],
    ratio: 3.74,
    themes: ["light"],
    why: "footer wordmark under the same `opacity-50`. Distinct from the header wordmark, which is the same string at 19:1 — which is why entries are route- and ratio-scoped.",
  },
];

/** One AA failure as the sweep found it. */
type Finding = {
  text: string;
  /** Selectors this element is inside, for scope-matching against ACCEPTED. */
  within: string[];
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
  return ({ r, forceFloor }: { r: string; forceFloor?: number }) => {
    /**
     * Resolve any CSS colour to straight RGBA, format-agnostically.
     *
     * Painting it over white AND over black recovers both the alpha and the
     * un-multiplied colour: over white gives `c·a + 255(1−a)`, over black gives
     * `c·a`, and the difference is `255(1−a)`. That works whatever space the
     * value was authored in — `oklch(… / 0.85)`, `color-mix`, `rgba` — which
     * matters because Chromium hands these back in their authored space.
     *
     * This replaces a version that painted every colour over hard-coded WHITE
     * and returned RGB. That silently assumed a white page — wrong by an order
     * of magnitude in dark, where the page is `oklch(0.13 0 0)` (#184 duel,
     * round 3).
     *
     * **It too changed no number, and the reason is the interesting part: the
     * two defects cancelled.** The `> 0.9` skip above meant a translucent
     * colour never reached this function, and every text colour in the app is
     * fully opaque (verified by sweeping all five routes in both themes). So
     * the wrong backdrop was only ever applied to values that carried no alpha
     * to composite. Each defect was real; together they produced correct
     * output. Fixing one alone would have been enough; fixing both is right.
     */
    const toRgba = (colour: string): [number, number, number, number] => {
      const read = (under: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.fillStyle = under;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = colour;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0] as number, d[1] as number, d[2] as number];
      };
      const onWhite = read("#ffffff");
      const onBlack = read("#000000");
      // Green channel is the most reliable of the three for recovering alpha.
      const a = Math.min(
        1,
        Math.max(
          0,
          1 - ((onWhite[1] as number) - (onBlack[1] as number)) / 255,
        ),
      );
      if (a <= 0.001) return [0, 0, 0, 0];
      const straight = [0, 1, 2].map((i) =>
        Math.min(255, Math.max(0, Math.round((onBlack[i] as number) / a))),
      );
      return [
        straight[0] as number,
        straight[1] as number,
        straight[2] as number,
        a,
      ];
    };

    /** Source-over: `fg` (with alpha) painted onto opaque `bg`. */
    const over = (
      fg: [number, number, number, number],
      bg: [number, number, number],
    ): [number, number, number] =>
      [0, 1, 2].map((i) =>
        Math.round((fg[i] as number) * fg[3] + (bg[i] as number) * (1 - fg[3])),
      ) as [number, number, number];

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

    /**
     * What is actually painted behind this text, compositing every translucent
     * layer on the way up rather than skipping them.
     *
     * The previous version rejected any background with alpha ≤ 0.9 and walked
     * past it, on the stated grounds that tints shift the result by less than
     * the tolerance. That reasoning is wrong for `AppHeader`, which is
     * `bg-background/85` — a real surface, not a tint (#184 duel, round 3).
     *
     * **Measured honestly, fixing it changed no number.** `bg-background/85`
     * sits over `background`, the same colour, so skipping the layer and
     * compositing it give byte-identical backdrops — [251,250,249] light and
     * [7,7,7] dark, scrolled and unscrolled alike. The fix is right in
     * principle and inert in practice, and saying otherwise in a commit message
     * was an overclaim worth correcting here rather than leaving on the record.
     *
     * It is kept because it stops being inert the moment a translucent surface
     * differs from what is behind it.
     *
     * `node` is the nearest ancestor that paints anything at all, which is the
     * surface the text visually sits on and the right place to stop the opacity
     * walk.
     */
    const backgroundBehind = (
      el: Element | null,
    ): { colour: [number, number, number]; node: Element | null } => {
      const layers: Array<[number, number, number, number]> = [];
      let node: Element | null = el;
      let surface: Element | null = null;
      let base: [number, number, number] | null = null;

      while (node) {
        const rgba = toRgba(getComputedStyle(node).backgroundColor);
        if (rgba[3] > 0) {
          if (!surface) surface = node;
          layers.push(rgba);
          if (rgba[3] >= 0.999) {
            base = [rgba[0], rgba[1], rgba[2]];
            layers.pop();
            break;
          }
        }
        node = node.parentElement;
      }

      if (!base) {
        const body = toRgba(getComputedStyle(document.body).backgroundColor);
        base = body[3] > 0 ? [body[0], body[1], body[2]] : [255, 255, 255];
      }

      // Composite outermost-inward so the nearest layer lands last.
      let colour = base;
      for (let i = layers.length - 1; i >= 0; i -= 1) {
        colour = over(layers[i] as [number, number, number, number], colour);
      }
      return { colour, node: surface ?? document.body };
    };

    /**
     * Opacity multiplies down the tree, so the element's own value is not the
     * one the user sees through.
     *
     * `/goals` and `/compare` wrap their footer in `opacity-50`; the `<p>`
     * inside computes `opacity: 1` and scores ~17:1 while Chromium paints it at
     * 3.73:1. Reading only the element's own opacity therefore hid a live AA
     * failure on two routes — found by the duel on #184.
     */
    const effectiveOpacity = (
      el: Element | null,
      stopAt: Element | null,
    ): number => {
      let alpha = 1;
      let node: Element | null = el;
      while (node && node !== stopAt) {
        const own = Number(getComputedStyle(node).opacity);
        alpha *= Number.isFinite(own) ? own : 1;
        node = node.parentElement;
      }
      return alpha;
    };

    /** Composite `fg` over `bg` at `alpha`, which is what the eye receives. */
    const composite = (
      fg: [number, number, number],
      bg: [number, number, number],
      alpha: number,
    ): [number, number, number] =>
      [0, 1, 2].map((i) =>
        Math.round((fg[i] as number) * alpha + (bg[i] as number) * (1 - alpha)),
      ) as [number, number, number];

    const found: Finding[] = [];

    /**
     * WCAG 1.4.3 exempts "an inactive user interface component" from any
     * contrast requirement, and this app dims disabled controls with
     * `disabled:opacity-50` — the wizard's `← Back` on step 0 paints at
     * 3.74:1 purely because it is disabled. Measuring it would force a real
     * exemption into the accepted-failures list, which is the wrong place for
     * something that is not a failure.
     */
    const isInactive = (el: Element): boolean => {
      let node: Element | null = el;
      while (node) {
        if (
          (node as HTMLButtonElement).disabled === true ||
          node.getAttribute("aria-disabled") === "true"
        ) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const measure = (
      el: Element,
      text: string,
      colour: string,
      cs: CSSStyleDeclaration,
    ) => {
      const box = (el as HTMLElement).getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return;
      if (isInactive(el)) return;

      const backdrop = backgroundBehind(el);
      // Opacity splits into two stages that do OPPOSITE things:
      //
      //  - `below` is opacity between the text and its backdrop. It dims the
      //    text against a backdrop that is NOT dimmed with it, so contrast
      //    drops. The dashboard footer is this shape.
      //  - `above` is opacity on the backdrop element and upward. The whole
      //    group renders first and is then composited over what lies outside
      //    it, so text and backdrop move TOGETHER. A dimmed button with its own
      //    `bg-foreground` is this shape: at 50% its white text stays white
      //    over a white page while its black fill goes grey, and 19:1 becomes
      //    3.7:1.
      //
      // Collapsing the two was wrong in both directions — a real failure
      // missed and a false alarm raised (#184 duel, round 2).
      const below = effectiveOpacity(el, backdrop.node);
      const above = effectiveOpacity(backdrop.node, null);
      if (below * above < 0.05) return;

      const fontSize = parseFloat(cs.fontSize);
      const fontWeight = Number(cs.fontWeight) || 400;
      // WCAG 1.4.3: large text is 24px, or 18.66px when bold.
      const isLarge =
        fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const floor = forceFloor ?? (isLarge ? 3 : 4.5);

      const background = backdrop.colour;
      const outer =
        backdrop.node && backdrop.node !== document.body
          ? backgroundBehind(backdrop.node.parentElement).colour
          : background;

      // The text's own colour may carry alpha too, so it is composited onto
      // its backdrop rather than read as opaque.
      const textOnBackdrop = over(toRgba(colour), background);

      const paintedBg = composite(background, outer, above);
      const paintedText = composite(
        composite(textOnBackdrop, background, below),
        outer,
        above,
      );
      const ratio = contrast(paintedText, paintedBg);

      if (ratio < floor) {
        found.push({
          text: text.slice(0, 40),
          within: ["footer", "article", "nav", "header", "main", "body"].filter(
            (sel) => el.closest(sel) !== null,
          ),
          ratio: Math.round(ratio * 100) / 100,
          route: r,
          color: colour,
          background,
          fontSize,
          fontWeight,
          floor,
        });
      }
    };

    document.querySelectorAll("*").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return;

      // Form controls paint their value and placeholder without ever owning a
      // text node, so the ownership rule below skips every one of them — which
      // silently exempted the whole of `/settings`. Found by the duel on #184.
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
        const value = (el as HTMLInputElement).value;
        if (value) measure(el, `${tag} value "${value}"`, cs.color, cs);
        const placeholder = (el as HTMLInputElement).placeholder;
        if (placeholder) {
          const ph = getComputedStyle(el, "::placeholder");
          measure(el, `${tag} placeholder "${placeholder}"`, ph.color, ph);
        }
        return;
      }

      // Otherwise only the element that OWNS the text node, so a wrapper is not
      // credited with its child's contrast and measured twice.
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim();
      if (!own) return;

      measure(el, own, cs.color, cs);
    });

    return found;
  };
}

/**
 * Wait until the page is genuinely ready to measure.
 *
 * Order matters, and getting it wrong is silent. This first read
 * `document.getAnimations()` immediately after `goto`, which is BEFORE React
 * mounts: the list came back empty, the await resolved instantly, and the
 * sweep measured a half-rendered page. A duel reviewer turned the whole spec
 * red under CPU throttling that way — the wizard kicker reading 1.73:1 instead
 * of 2.96:1 — so the verdict depended on machine load, which is the exact
 * property that dropping the old fixed 250ms timeout was meant to remove
 * (#184 duel, round 2).
 *
 * `animate-slide-up` runs opacity 0 → 1 over 0.5s, so measuring mid-flight
 * invents failures that do not exist. Wait for the app to be there, THEN for
 * its animations to finish, then confirm none started while we waited.
 */
async function settle(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(() => document.querySelectorAll("*").length > 20);
  for (let pass = 0; pass < 3; pass += 1) {
    const running = await page.evaluate(async () => {
      await Promise.all(
        document.getAnimations().map((a) => a.finished.catch(() => undefined)),
      );
      return document.getAnimations().filter((a) => a.playState === "running")
        .length;
    });
    if (running === 0) return;
  }
}

async function sweepTheme(
  page: import("@playwright/test").Page,
  theme: "light" | "dark",
  /** Override the WCAG floor — the size-independent pass sets 4.5 for all. */
  forceFloor?: number,
): Promise<Finding[]> {
  await page.emulateMedia({ colorScheme: theme });
  const all: Finding[] = [];
  for (const route of ROUTES) {
    await page.goto(route);
    await settle(page);
    if (theme === "dark") {
      await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
    }
    all.push(...(await page.evaluate(sweep(route), { r: route, forceFloor })));
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
      (f) =>
        !accepted.some(
          (a) =>
            f.text === a.text &&
            a.routes.includes(f.route) &&
            f.within.includes(a.within) &&
            // The ratio is part of the identity. "Affordo" is the footer
            // wordmark at 3.74:1 AND the header wordmark at 19:1 on the same
            // routes, so text+route alone let one absorb a real failure in the
            // other (#184 duel, round 2).
            Math.abs(f.ratio - a.ratio) <= 0.15,
        ),
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
      for (const route of entry.routes) {
        const hit = findings.find(
          (f) =>
            f.text === entry.text &&
            f.route === route &&
            f.within.includes(entry.within),
        );

        // A stale entry is a failure in its own right. The `--card` row in ADR
        // 0022 spent a release naming a site that no longer existed, and
        // nothing could tell — the mistake this assertion exists to prevent.
        expect(
          hit,
          `"${entry.text}" on ${route} is recorded as an accepted AA failure (${entry.why}) but no longer fails in ${theme}. If it was fixed, delete the entry.`,
        ).toBeDefined();

        expect(
          hit?.ratio,
          `"${entry.text}" on ${route} was recorded at ${entry.ratio}:1 and now measures ${hit?.ratio}:1`,
        ).toBeCloseTo(entry.ratio, 1);
      }
    }
  });
}

/**
 * The accent pairing, checked independently of text size (#184 duel).
 *
 * WCAG's large-text allowance is real — 3.0 rather than 4.5 above 24px — and
 * the sweep above honours it. But it also means the very pairing this guard is
 * named for walks straight through at a large size: `text-accent` on the goal
 * card's 36px `<h2>` paints 3.09:1, clears the 3.0 floor, and every assertion
 * above passes. The duel demonstrated exactly that.
 *
 * Issue #183's first acceptance criterion carries no size qualifier, and
 * neither does ADR 0022, which pinned these pairings as failures outright. So
 * this asserts the pairing itself: no element paints the accent colour as text
 * anywhere except the one place case 4 accepted.
 *
 * It compares painted pixels rather than class names, so it survives the
 * indirect routes a `grep` would miss — a nested custom property, a `style`
 * attribute, a token realiased in `@theme`.
 */
test("no text sits below AA-normal at any size", async ({ page }) => {
  // The size-independent half of the guard.
  //
  // The sweep above honours WCAG's large-text allowance (3.0 above 24px),
  // which is right as WCAG and wrong as a guard here: `text-accent` on the goal
  // card's 36px heading paints 3.09:1, clears 3.0, and sailed through every
  // assertion. Issue #183's first criterion and ADR 0022 both state these
  // pairings with no size qualifier at all.
  //
  // An earlier version compared painted pixels to the resolved `--accent`
  // token. A duel reviewer bypassed it in one line with `text-[#f5690f]` —
  // `rgb(245,105,15)` against the token's `rgb(243,104,15)` — restoring the
  // 3.04:1 defect with every test green. Exact equality guards a TOKEN, not a
  // colour, and hand-written near-misses are exactly how tokens get bypassed
  // here (`emerald-600` is one).
  //
  // So this drops hue entirely and asserts the property that actually matters:
  // nothing paints text under 4.5:1, whatever its size, colour or origin.
  const offenders: string[] = [];

  for (const theme of ["light", "dark"] as const) {
    const findings = await sweepTheme(page, theme, 4.5);
    const accepted = ACCEPTED.filter((a) => a.themes.includes(theme));
    offenders.push(
      ...findings
        .filter(
          (f) =>
            !accepted.some(
              (a) =>
                f.text === a.text &&
                a.routes.includes(f.route) &&
                f.within.includes(a.within) &&
                Math.abs(f.ratio - a.ratio) <= 0.15,
            ),
        )
        .map(
          (f) =>
            `${theme} ${f.route} "${f.text}" ${f.ratio}:1 at ${f.fontSize}px/${f.fontWeight}`,
        ),
    );
  }

  expect(
    offenders,
    "text below 4.5:1. WCAG would allow this above 24px, but ADR 0022 and #183 pin these pairings regardless of size",
  ).toEqual([]);
});

test("the sweep can see the app at all", async ({ page }) => {
  // Without this every "no failures" assertion above is trivially true — the
  // exact shape of dead guard that #183 is about. If a routing change or a
  // hydration gate ever leaves these pages blank, this is what says so.
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/goals");
  // `settle()`, not a fixed timer. This test kept the 250ms wait that
  // `settle()` was introduced to remove, and under CPU throttling it was the
  // only test in the file that went red (#184 duel, round 3) — a liveness
  // check that itself fails under load is worse than none.
  await settle(page);

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
