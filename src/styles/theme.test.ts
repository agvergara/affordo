import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Spec-fidelity guards for the motion layer (dossier §3). These assert the
 * reference keyframes and utilities exist in `theme.css` with the reference
 * timing and easing — a regression guard against a sibling PR clobbering the
 * keyframes region or the durations/easing drifting from the spec. jsdom does
 * not run CSS animations, so the observable contract we can assert is the
 * declaration text itself.
 */
const css = readFileSync(
  fileURLToPath(new URL("./theme.css", import.meta.url)),
  "utf8",
);

/** Collapse whitespace so assertions are insensitive to formatting. */
const normalized = css.replace(/\s+/g, " ");

const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

describe("motion keyframes and utilities (dossier §3)", () => {
  it("defines the slide-up keyframes: opacity 0→1, translateY 16px→0", () => {
    expect(normalized).toMatch(/@keyframes slide-up \{/);
    expect(normalized).toMatch(/opacity: 0;\s*transform: translateY\(16px\)/);
    expect(normalized).toMatch(/opacity: 1;\s*transform: translateY\(0\)/);
  });

  it("defines the scale-in-x keyframes: scaleX 0→1", () => {
    expect(normalized).toMatch(/@keyframes scale-in-x \{/);
    expect(normalized).toMatch(/transform: scaleX\(0\)/);
    expect(normalized).toMatch(/transform: scaleX\(1\)/);
  });

  it("exposes animate-slide-up at 0.5s with the reference easing", () => {
    expect(normalized).toContain(`animation: slide-up 0.5s ${EASING} both`);
  });

  it("exposes animate-scale-in-x at 0.7s, reference easing, origin left", () => {
    expect(normalized).toContain(`animation: scale-in-x 0.7s ${EASING} both`);
    expect(normalized).toMatch(
      /animate-scale-in-x \{[^}]*transform-origin: left/,
    );
  });
});

/**
 * The base layer stays the reference's three rules (#135).
 *
 * The reference's entire `@layer base` is `*` border-color, `body`, and
 * `::selection` (`styles.css:111`). This port carried the pre-parity app's
 * element-level rules for `input`, `select`, `label`, `button` and `fieldset`
 * long after #118 deleted the screens they were written for, and they kept
 * styling every control in the rebuild.
 *
 * They survived because an element selector is only beaten by a utility naming
 * the *same* property — so a 1px border and a 10px radius landed on everything
 * that had no `border-*` or `rounded-*` of its own. It took three PRs (#134,
 * #137, #138) neutralising it per element before anyone looked at the rule.
 *
 * A source assertion is the only observable: jsdom applies no stylesheet, so
 * nothing in the unit suite can see a base-layer rule reappear.
 */
describe("the base layer does not style form controls", () => {
  /** The `@layer base { … }` block, brace-matched rather than regexed. */
  function baseLayer(): string {
    const open = css.indexOf("@layer base");
    expect(open, "theme.css should declare @layer base").toBeGreaterThan(-1);
    let depth = 0;
    for (let i = css.indexOf("{", open); i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}" && --depth === 0) {
        return css.slice(open, i + 1);
      }
    }
    throw new Error("unbalanced @layer base");
  }

  it("finds a real base layer, so the assertions below cannot pass vacuously", () => {
    const layer = baseLayer();
    expect(layer.length).toBeGreaterThan(100);
    // The three rules that SHOULD be there — if these ever go, the guard below
    // would pass on an empty layer and mean nothing.
    expect(layer).toMatch(/\*\s*\{[^}]*border-color/);
    expect(layer).toMatch(/\bbody\s*\{/);
    expect(layer).toMatch(/::selection\s*\{/);
  });

  it.each([
    ["button", /(^|[\s,}])button\s*[,{:]/],
    ["input", /(^|[\s,}])input\s*[,{:]/],
    ["select", /(^|[\s,}])select\s*[,{:]/],
    ["label", /(^|[\s,}])label\s*[,{:]/],
    ["fieldset", /(^|[\s,}])fieldset\s*[,{:]/],
    ["legend", /(^|[\s,}])legend\s*[,{:]/],
  ])("has no element-level rule for %s", (_name, pattern) => {
    // Comments are stripped: this block is documented in prose that necessarily
    // names the elements it warns about, exactly as the surface-token scan in
    // contrast.test.ts had to handle.
    const code = baseLayer().replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toMatch(pattern);
  });

  it("catches an element rule being reintroduced", () => {
    // Non-vacuity: prove the patterns fire on the shape they guard against,
    // rather than trusting six negative assertions.
    const layer = "@layer base { button { border: 1px solid red; } }";
    expect(layer).toMatch(/(^|[\s,}])button\s*[,{:]/);
    expect("@layer base { * { border-color: red; } }").not.toMatch(
      /(^|[\s,}])button\s*[,{:]/,
    );
  });
});
