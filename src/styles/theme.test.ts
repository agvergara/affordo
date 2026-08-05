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
  /**
   * **Every** `@layer base { … }` block, brace-matched rather than regexed.
   *
   * All of them, not the first: a second block appended anywhere in the file
   * would be a perfectly ordinary way to reintroduce this, and a guard reading
   * only `indexOf` would never look at it.
   */
  function baseLayers(): string {
    const blocks: string[] = [];
    let from = 0;
    for (;;) {
      const open = css.indexOf("@layer base", from);
      if (open === -1) break;
      let depth = 0;
      let end = -1;
      for (let i = css.indexOf("{", open); i < css.length; i++) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}" && --depth === 0) {
          end = i;
          break;
        }
      }
      if (end === -1) throw new Error("unbalanced @layer base");
      blocks.push(css.slice(open, end + 1));
      from = end + 1;
    }
    expect(
      blocks.length,
      "theme.css should declare @layer base",
    ).toBeGreaterThan(0);
    return blocks.join("\n");
  }

  it("finds a real base layer, so the assertions below cannot pass vacuously", () => {
    const layer = baseLayers();
    expect(layer.length).toBeGreaterThan(100);
    // The three rules that SHOULD be there — if these ever go, the guard below
    // would pass on an empty layer and mean nothing.
    expect(layer).toMatch(/\*\s*\{[^}]*border-color/);
    expect(layer).toMatch(/\bbody\s*\{/);
    expect(layer).toMatch(/::selection\s*\{/);
  });

  /**
   * `[\s,}(:]` on the left, not just `[\s,}]`: `:where(button)`, `:is(button)`
   * and `html>button` are all ordinary ways to write this rule, and a guard
   * that only understood the shape the last author happened to use would wave
   * them through. `>` and `+` are in there for the same reason.
   */
  const selectorFor = (tag: string) =>
    new RegExp(`(^|[\\s,}(>+~])${tag}\\s*[,{:)]`);

  it.each([
    ["button", selectorFor("button")],
    ["input", selectorFor("input")],
    ["select", selectorFor("select")],
    ["label", selectorFor("label")],
    ["fieldset", selectorFor("fieldset")],
    ["legend", selectorFor("legend")],
    ["textarea", selectorFor("textarea")],
  ])("has no element-level rule for %s", (_name, pattern) => {
    // Comments are stripped: this block is documented in prose that necessarily
    // names the elements it warns about, exactly as the surface-token scan in
    // contrast.test.ts had to handle.
    const code = baseLayers().replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toMatch(pattern);
  });

  it.each([
    ["bare", "button { border: 1px solid red; }"],
    ["descendant", "html button { border: 1px solid red; }"],
    ["child combinator", "form>button { border: 1px solid red; }"],
    [":where()", ":where(button) { border: 1px solid red; }"],
    [":is()", ":is(button, input) { border: 1px solid red; }"],
    ["grouped", "a, button { border: 1px solid red; }"],
    ["pseudo", "button:hover { border-color: red; }"],
  ])("catches a %s reintroduction", (_shape, rule) => {
    // Seven shapes, not the one the last author happened to try. Six negative
    // assertions are worth nothing without proof the pattern fires at all.
    expect(rule).toMatch(selectorFor("button"));
  });

  it("does not fire on the three rules that belong there", () => {
    for (const ok of [
      "* { border-color: var(--border); }",
      "body { background-color: var(--background); }",
      "::selection { background-color: var(--accent); }",
    ]) {
      for (const tag of ["button", "input", "select", "label"]) {
        expect(ok).not.toMatch(selectorFor(tag));
      }
    }
  });
});
