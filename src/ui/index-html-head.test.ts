import { describe, expect, it } from "vitest";
// Load the real shipped shell as a string via Vite's ?raw. These assertions
// cover the *root* head as index.html ships it — the tags a non-JS crawler
// sees, and the ones the app never overwrites (og:type, twitter:card).
//
// They no longer cover the whole story: #111 made the head per-screen, so
// `src/ui/documentHead.ts` swaps title/description/og:title/og:description at
// runtime and `Router.test.tsx` pins that. This file's earlier framing — "the
// head lives in index.html, not a React route" — was true when written and is
// not now. Narrowed rather than deleted, because the shipped shell is still
// the only thing a crawler reads and nothing else asserts it.
//
// Named for the artefact rather than the module: it was `documentHead.test.ts`,
// which sat beside a `documentHead.ts` it does not test — and `X.test.ts` tests
// `X.ts` is what `vitest related`, coverage mappings and plain instinct all
// assume before anyone reads a comment. Follows `deploy-config.test.ts`.
import html from "../../index.html?raw";

/** Extract the text between the first <title>…</title>. */
function title(source: string): string | null {
  return source.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? null;
}

/** Find a <meta> tag by an attribute=value pair and return its content. */
function metaContent(
  source: string,
  attr: "name" | "property",
  value: string,
): string | null {
  const tag = source.match(
    new RegExp(`<meta[^>]*\\b${attr}=["']${value}["'][^>]*>`, "i"),
  )?.[0];
  return tag?.match(/content=["']([^"']*)["']/)?.[1] ?? null;
}

describe("document head", () => {
  it("sets the reference root title with its em-dash", () => {
    expect(title(html)).toBe("Affordo — Audit: Life/Cost");
  });

  it("carries the reference meta description", () => {
    expect(metaContent(html, "name", "description")).toBe(
      "Weigh purchases against your working hours. A private, local-first affordability calculator.",
    );
  });

  it("carries the reference Open Graph tags", () => {
    expect(metaContent(html, "property", "og:title")).toBe(
      "Affordo — Audit: Life/Cost",
    );
    expect(metaContent(html, "property", "og:description")).toBe(
      "Weigh purchases against your working hours.",
    );
    expect(metaContent(html, "property", "og:type")).toBe("website");
  });

  it("carries the reference Twitter card tag", () => {
    expect(metaContent(html, "name", "twitter:card")).toBe("summary");
  });

  it("references no og:image, matching the reference (no image asset)", () => {
    expect(metaContent(html, "property", "og:image")).toBeNull();
  });
});
