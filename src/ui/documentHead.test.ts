import { describe, expect, it } from "vitest";
// Load the real shipped shell as a string via Vite's ?raw. The document head
// lives in index.html (a plain Vite SPA), not a React route, so these
// assertions read the actual file — the reference title and social meta can't
// silently drift out of the shell that serves them.
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
