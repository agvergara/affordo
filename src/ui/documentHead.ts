/**
 * Per-screen document head (dossier §1, PRD #39 story 73).
 *
 * The reference is a TanStack Start app where each route exports a `head()`.
 * This port is a client-only SPA (ADR 0018), so there is no server to render
 * per-route tags into the shipped HTML — `index.html` carries the root set, and
 * the router swaps in the route's at navigation.
 *
 * That difference is worth being honest about: a crawler that does not execute
 * JavaScript sees only the root tags, so the per-route `og:*` values are
 * effectively for people (tab labels, shared links opened in a real browser)
 * rather than for machines. The reference has the same values with better
 * delivery; reproducing the values is what #39 asks for, and reproducing the
 * delivery would mean SSR, which #39 rules out.
 */
export interface DocumentHead {
  title: string;
  description: string;
  /** Defaults to `description` — they differ only at the root (§1). */
  ogDescription?: string;
}

/**
 * The root head, verbatim from §1. Applied to any *path* with no head of its
 * own — `/` (the redirect gate) and any unmatched path (the 404 screen) — so
 * navigating away from a titled screen never leaves its title behind.
 *
 * Note it is keyed on the **path**, not on what rendered. A titled route whose
 * screen throws keeps its own title while the error boundary is displayed: the
 * tab reads `Goals · Affordo` above "Something broke". That is deliberate and
 * matches the reference, where `head()` belongs to the route that matched
 * rather than to the outcome of rendering it — but it is the kind of thing a
 * comment can quietly claim otherwise, so it is pinned by a test.
 */
export const ROOT_HEAD: DocumentHead = {
  title: "Affordo — Audit: Life/Cost",
  description:
    "Weigh purchases against your working hours. A private, local-first affordability calculator.",
  ogDescription: "Weigh purchases against your working hours.",
};

/**
 * Per-route heads, verbatim from §1. The separator is a middle dot (U+00B7),
 * not a bullet or a hyphen.
 */
export const ROUTE_HEADS: Readonly<Record<string, DocumentHead>> = {
  "/onboarding": {
    title: "Set up · Affordo",
    description:
      "Configure your financial profile once. Then weigh purchases in seconds.",
  },
  "/goals": {
    title: "Goals · Affordo",
    description: "See every purchase weighed against your working hours.",
  },
  "/settings": {
    title: "Settings · Affordo",
    description: "Edit your financial profile and preferences.",
  },
};

/** The head for a path, falling back to the root set (§1: `/` has no `head()`). */
export function headForPath(path: string): DocumentHead {
  return ROUTE_HEADS[path] ?? ROOT_HEAD;
}

/**
 * Write a head onto the live document.
 *
 * Existing tags are updated in place rather than replaced: `index.html` already
 * ships the root set, and recreating the elements on every navigation would
 * churn the head and discard anything else living there.
 */
export function applyDocumentHead(head: DocumentHead): void {
  const ogDescription = head.ogDescription ?? head.description;
  document.title = head.title;
  setMeta("name", "description", head.description);
  setMeta("property", "og:title", head.title);
  setMeta("property", "og:description", ogDescription);
}

/** Update a meta tag's content, creating the tag if the document lacks it. */
function setMeta(attribute: "name" | "property", key: string, value: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", value);
}
