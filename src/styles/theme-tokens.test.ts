// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// The stylesheet is read as raw source text. A plain `import "./theme.css?raw"`
// can't be used here: the `@tailwindcss/vite` plugin claims every `.css`
// module and hands back a processed (empty-at-test-time) result, so we read
// the file off disk instead. Vitest runs with the repo root as cwd.
//
// The reference oklch token system (dossier §3) is declared as plain custom
// properties on :root (light) and .dark (latent). Those rules are ordinary
// CSS — jsdom's CSSOM applies them and resolves the variables — so we can
// assert the *computed* value of a token by mounting the stylesheet and
// reading it back off a real element, exactly as the browser would.
const css = readFileSync(join(cwd(), "src/styles/theme.css"), "utf8");

// jsdom cannot parse Tailwind's @import / @theme / @utility at-rules; strip
// everything that isn't a plain rule so the :root and .dark declarations we
// care about survive into the CSSOM. We keep only the token-bearing blocks.
function mountTokenRules(): HTMLStyleElement {
  const style = document.createElement("style");
  // Extract the top-level :root {...} and .dark {...} declaration blocks
  // verbatim (they contain no nested braces), skipping the @media/@theme
  // at-rules jsdom can't parse.
  const blocks =
    css.match(/(?:^|\n)(?::root|\.dark)\s*\{[^{}]*\}/g)?.join("\n") ?? "";
  style.textContent = blocks;
  document.head.appendChild(style);
  return style;
}

function tokenValue(selectorClass: string | null, name: string): string {
  const el = document.documentElement;
  const prev = el.className;
  if (selectorClass) el.className = selectorClass;
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  el.className = prev;
  return value;
}

describe("reference oklch color tokens (dossier §3)", () => {
  let style: HTMLStyleElement;
  beforeEach(() => {
    style = mountTokenRules();
  });
  afterEach(() => {
    style.remove();
    document.documentElement.className = "";
  });

  it("resolves the light background token to its reference oklch value", () => {
    expect(tokenValue(null, "--background")).toBe("oklch(0.985 0.002 60)");
  });

  it("inverts background and foreground under the latent .dark class", () => {
    // Dark is defined but nothing toggles it in this slice; a .dark ancestor
    // still flips the tokens, which is the whole point of defining them now.
    expect(tokenValue("dark", "--background")).toBe("oklch(0.13 0 0)");
    expect(tokenValue("dark", "--foreground")).toBe("oklch(0.985 0.002 60)");
    // And the light values are untouched without the class.
    expect(tokenValue(null, "--foreground")).toBe("oklch(0.13 0 0)");
  });

  it("carries the orange accent in both light and dark", () => {
    expect(tokenValue(null, "--accent")).toBe("oklch(0.68 0.19 45)");
    expect(tokenValue("dark", "--accent")).toBe("oklch(0.72 0.19 45)");
    // ring tracks accent (dossier §3: focus ring = accent).
    expect(tokenValue(null, "--ring")).toBe("oklch(0.68 0.19 45)");
  });

  it("defines the muted-foreground token used by eyebrows and captions", () => {
    expect(tokenValue(null, "--muted-foreground")).toBe("oklch(0.45 0 0)");
    expect(tokenValue("dark", "--muted-foreground")).toBe("oklch(0.7 0 0)");
  });

  it("maps every reference token through @theme so its utility resolves", () => {
    // @theme inline aliases each --color-* to its --token by reference. jsdom
    // can't run Tailwind, so assert the mapping exists in source: a missing
    // alias means the utility (e.g. bg-background) would never resolve.
    const theme = css.match(/@theme inline\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    for (const token of [
      "background",
      "foreground",
      "card",
      "card-foreground",
      "popover",
      "popover-foreground",
      "primary",
      "primary-foreground",
      "secondary",
      "secondary-foreground",
      "muted",
      "muted-foreground",
      "accent",
      "accent-foreground",
      "destructive",
      "destructive-foreground",
      "border",
      "input",
      "ring",
    ]) {
      expect(theme).toContain(`--color-${token}: var(--${token});`);
    }
  });

  it("paints text selection in the accent via the base layer", () => {
    // ::selection can't be inspected through getComputedStyle in jsdom, so
    // assert the base-layer rule exists in source with the accent tokens.
    expect(baseLayer()).toMatch(
      /::selection\s*\{[^}]*background-color:\s*var\(--accent\);[^}]*color:\s*var\(--accent-foreground\);/,
    );
  });

  it("gives every element the border token as its default border color", () => {
    expect(baseLayer()).toMatch(
      /\*\s*\{\s*border-color:\s*var\(--border\);\s*\}/,
    );
  });

  // The base layer paints inputs, selects, buttons and labels with the LEGACY
  // warm-editorial tokens (--ink on inputs, --stone on labels), not the
  // reference oklch ones. Those legacy tokens were flipped only by the
  // prefers-color-scheme block, so a user-chosen dark theme left dark ink on
  // the near-black --background: the settings fields went invisible. The
  // class-based theme has to flip them too, or choosing dark breaks any
  // component still reading them.
  // Scope note: this harness can only observe the `:root` and `.dark` blocks —
  // `mountTokenRules()`'s regex requires the selector at column 0, so the
  // `@media (prefers-color-scheme: dark)` block's indented `:root` is excluded
  // and nothing here says anything about OS-driven dark. That gap is real and
  // tracked: the media block still overrides an explicit light choice on a
  // dark-set OS.
  describe("legacy tokens flip when the .dark class is applied", () => {
    it("flips the ink the base layer paints input text with", () => {
      expect(tokenValue(null, "--ink")).toBe("#1c1a17");
      expect(tokenValue("dark", "--ink")).toBe("#f5efe4");
    });

    it("flips the canvas and the muted stone the labels use", () => {
      expect(tokenValue("dark", "--canvas")).toBe("#1c1a17");
      expect(tokenValue("dark", "--stone")).toBe("#a8a093");
    });
  });
});

// The `@layer base` block contains nested `{}` rules, so no single regex can
// balance to its own closing brace. Bounding the slice to the start of the
// next top-level at-rule (`@layer components`) keeps the assertions scoped to
// base — a rule that drifted into `components` no longer passes them.
function baseLayer(): string {
  const start = css.indexOf("@layer base {");
  if (start === -1) return "";
  const next = css.indexOf("@layer components", start);
  return css.slice(start, next === -1 ? undefined : next);
}
