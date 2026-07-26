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

  it("keeps the existing .reveal animation intact", () => {
    expect(normalized).toMatch(/\.reveal \{[^}]*animation: reveal-in 0\.28s/);
    expect(normalized).toMatch(/@keyframes reveal-in \{/);
  });
});
