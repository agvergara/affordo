import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The deployment contract that keeps the client-side router reachable.
 *
 * This is a regression guard, not a test of the hosting behaviour — Vercel's
 * routing cannot be exercised from here, and `vite preview` masks its absence
 * by doing SPA fallback for free (see `playwright.config.ts`). That masking is
 * exactly why the original bug shipped: every route except `/` 404'd in
 * production while the whole suite stayed green.
 *
 * So this asserts the file contract instead. If the rewrite is deleted or
 * renamed, this fails; it will not notice Vercel changing its own semantics.
 * Prior art for asserting a non-TS artefact: `src/ui/documentHead.test.ts`
 * (index.html) and `src/styles/theme.test.ts` (CSS tokens).
 */
const config = JSON.parse(
  readFileSync(resolve(__dirname, "..", "vercel.json"), "utf8"),
) as {
  trailingSlash?: boolean;
  rewrites?: Array<{ source: string; destination: string }>;
};

describe("deploy config", () => {
  it("serves the SPA shell for every path, so the router can read the pathname", () => {
    expect(config.rewrites).toEqual([
      { source: "/(.*)", destination: "/index.html" },
    ]);
  });

  it("pins one canonical URL per route rather than accepting both spellings", () => {
    // Left undefined, Vercel serves `/goals` and `/goals/` as two 200-identical
    // URLs, which its own docs advise against.
    expect(config.trailingSlash).toBe(false);
  });
});
