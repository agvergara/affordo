import { describe, expect, it } from "vitest";
import { inlineTitleScript } from "../../vite-plugin-inline-title";
import { ROOT_HEAD, ROUTE_HEADS } from "./documentHead";

/**
 * The build-time inline title script (#129).
 *
 * **Why this file and not `index-html-head.test.ts`:** that suite reads the
 * *source* `index.html`, so a `transformIndexHtml` plugin is invisible to it.
 * The issue asked for this to be decided rather than discovered later. Decision:
 * pin the plugin here, where its failure modes can be provoked directly, and
 * pin the end result with an e2e title assertion. Asserting `dist/index.html`
 * was rejected — it would make the unit suite depend on a build artifact
 * existing, so the tests would pass or fail on whether someone had run `npm run
 * build`, not on the code.
 */

/** Minimal stand-in for the head the plugin anchors into. */
const HTML = `<!doctype html><html><head><title>Affordo — Audit: Life/Cost</title></head><body></body></html>`;

/** Run the plugin's transform, whatever hook shape Vite is given. */
function transform(html: string): string {
  // Vite accepts the hook as a bare function or as `{handler}`/`{transform}`;
  // narrow through `unknown` rather than pick one and break on a Vite upgrade.
  const hook = inlineTitleScript().transformIndexHtml as unknown;
  const fn =
    typeof hook === "function"
      ? hook
      : ((hook as { handler?: unknown; transform?: unknown })?.handler ??
        (hook as { transform?: unknown })?.transform);
  if (typeof fn !== "function") {
    throw new Error("plugin exposes no transformIndexHtml");
  }
  const out = (fn as (h: string) => string | undefined).call(
    { environment: undefined } as never,
    html,
  );
  return typeof out === "string" ? out : html;
}

/** The `{path: title}` object literal the emitted script carries. */
function emittedMap(html: string): Record<string, string> {
  const m = /var t=(\{.*?\});/.exec(transform(html));
  expect(m?.[1], "no title map found in the emitted script").toBeTruthy();
  return JSON.parse(m?.[1] ?? "{}") as Record<string, string>;
}

/**
 * Execute the emitted script for a given path and report the resulting title.
 *
 * The script is what ships, so it is what gets tested. Re-deriving its logic in
 * the test proves only that two copies of an idea agree.
 */
function titleFor(pathname: string): string {
  const body = /<script>([\s\S]*?)<\/script>/.exec(transform(HTML))?.[1];
  expect(body, "no inline script emitted").toBeTruthy();
  const doc = { title: ROOT_HEAD.title };
  new Function("location", "document", body as string)({ pathname }, doc);
  return doc.title;
}

describe("the inline title script", () => {
  it("lands immediately after the real </title>", () => {
    // Placement is load-bearing. Before `<title>` the window never opens
    // either — but only because setting `document.title` on a titleless
    // document *creates* a `<title>`, leaving two in the document.
    const out = transform(HTML);
    const closeTitle = out.indexOf("</title>");
    const scriptStart = out.indexOf("<script>");
    expect(closeTitle).toBeGreaterThan(-1);
    expect(scriptStart).toBeGreaterThan(closeTitle);
    expect(out.slice(closeTitle + "</title>".length, scriptStart).trim()).toBe(
      "",
    );
  });

  it("is synchronous — no defer, async, or module type", () => {
    // The whole point is running before the parser reaches <body>. Any of
    // these would put it back behind the same barrier as `main.tsx`.
    const tag = /<script[^>]*>/.exec(transform(HTML))?.[0] ?? "";
    expect(tag).toBe("<script>");
  });

  it("carries every route's title, generated from documentHead", () => {
    // Generated, not duplicated: `documentHead.ts` stays the single source and
    // drift is impossible by construction. This asserts the generation, so a
    // renamed or added route that the parser misses fails here.
    const map = emittedMap(HTML);
    expect(map["/"]).toBe(ROOT_HEAD.title);
    for (const [path, head] of Object.entries(ROUTE_HEADS)) {
      expect(map[path], `missing title for ${path}`).toBe(head.title);
    }
    expect(Object.keys(map)).toHaveLength(Object.keys(ROUTE_HEADS).length + 1);
  });

  it("keeps the middle dot and em dash intact through generation", () => {
    // The titles carry U+00B7 and U+2014. A generator that mangled them would
    // still produce a plausible-looking map, and every assertion above would
    // pass if it compared mangled against mangled — so compare against the
    // literal characters.
    const map = emittedMap(HTML);
    expect(map["/goals"]).toContain("·");
    expect(map["/"]).toContain("—");
  });

  it("resolves a trailing slash to the same route", () => {
    // `vercel.json` sets `trailingSlash: false`, but a user can still type
    // `/goals/`. Without the strip, that path misses the map and holds the
    // root title — the exact window this closes.
    //
    // This *runs the emitted script* rather than re-deriving the lookup here.
    // The first version of this test reimplemented the path normalisation in
    // the test body, so deleting the strip from the plugin left it green: it
    // was asserting its own arithmetic.
    expect(titleFor("/goals/")).toBe(ROUTE_HEADS["/goals"]?.title);
    expect(titleFor("/goals")).toBe(ROUTE_HEADS["/goals"]?.title);
    expect(titleFor("/")).toBe(ROOT_HEAD.title);
  });

  it("leaves the root title alone on a path it does not know", () => {
    // The 404 screen has no head of its own (§1), so an unmatched path must
    // fall through rather than blanking the tab.
    expect(titleFor("/nope")).toBe(ROOT_HEAD.title);
  });

  it("throws rather than emitting an empty map it cannot anchor", () => {
    // An empty map, or a missing anchor, would silently restore the whole
    // window this exists to close while every other test still passed.
    expect(() => transform("<html><head></head><body></body></html>")).toThrow(
      /no <\/title> to anchor to/,
    );
  });
});
