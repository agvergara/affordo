import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The shipped document head lives in index.html (a plain Vite SPA), not in a
// React route. These assertions read the real file so the reference title and
// social meta can't silently drift out of the shell that actually serves them.
const html = readFileSync(
  fileURLToPath(new URL("../../index.html", import.meta.url)),
  "utf8",
);

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
