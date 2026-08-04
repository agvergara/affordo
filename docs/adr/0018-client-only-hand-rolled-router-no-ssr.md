# Client-only hand-rolled router; no SSR / TanStack Start

Affordo grows from a single calculator screen into a multi-screen app
(`/onboarding`, `/goals`, `/settings`, plus the calculator at `/`). To pick a
screen from the URL we add a tiny hand-rolled client router rather than adopting
a router framework.

The router reads `window.location.pathname` and looks the screen up in a static
route table; unknown paths render a 404 screen; the whole routed tree sits inside
a root React error boundary so a render error on any route falls back to a
recovery screen instead of a blank page. It ships no SSR and no data-loading
layer.

Rationale:
- The app is a client-only static bundle with no backend (ADR 0004) and is
  web-first React DOM + Vite (ADR 0009). SSR frameworks such as TanStack Start or
  Next.js assume a server render step that we deliberately do not have; adopting
  one would reintroduce a server we rejected and complicate the static-hosting
  story.
- The routing need in v1 is small — a handful of flat, mostly static paths — so a
  route table keyed on the pathname is enough. It carries no dependency, no
  bundle weight, and no framework conventions to learn, and it stays trivially
  testable with Testing Library by driving `window.history` and mounting the
  Router.
- `/` remains the existing calculator (`src/ui/App.tsx`) so the Playwright e2e
  suite, which loads `/` and drives the calculator, stays green. Turning `/` into
  a redirect gate is a deliberately separate, later slice.
- A root error boundary is client-only recovery (ADR 0004): the error is logged
  to the console and never sent anywhere.

## Consequence: shared links unfurl with the root metadata

Choosing no SSR costs two things worth naming, because both are invisible until
someone looks for them. Per-route `<title>`/`description`/`og:*` are written at
runtime by `src/ui/documentHead.ts` (#111), and the shipped `index.html` carries
only the root set.

**Shares.** Unfurlers that do not execute JavaScript — Slack, iMessage, WhatsApp
and Twitter among them — read the shipped HTML only, so every shared link unfurls
with the root card whatever screen it points at. Note the qualifier: some
crawlers *do* render JavaScript (Googlebot does), so this is not "no machine ever
sees the per-route tags", it is "any consumer that does not run JS sees only the
root ones."

**Tabs, briefly.** `index.html` loads `/src/main.tsx` as a module script, which is
deferred by spec, so the tab paints the root title before React boots and then
swaps. Measured against the built app: `Affordo — Audit: Life/Cost` at
`readyState=loading`, `Set up · Affordo` once complete. Because navigation is
`window.location.replace` (a full document load), this happens on **every**
navigation, not only the first.

`Router.tsx` applies the head in a layout effect to keep that window as short as
it can be *once React is running* — the swap lands in React's first commit rather
than after a paint. It cannot help with the window before React exists at all,
which is the larger part: measured at **56.5ms** warm on localhost, **89.9ms**
under a 6× CPU throttle, and **1.9s** on a 400ms/400kbps link. Not a flicker.

**Closing it does not require a server.** A synchronous inline `<script>` in the
head, setting `document.title` from the pathname before the parser reaches the
body, shortens it to ~0.4ms — the swap then happens at `readyState=loading`. We
do not do that, and the reason is a trade rather than an impossibility: it means a
second copy of the route→title map living in `index.html`, which can drift from
`documentHead.ts` silently and would have to be kept in step by hand. Given the
cost above is a title flash rather than wrong content, that duplication is not
worth buying — but the option exists, and this ADR should not be read as saying
otherwise.

**Shares are different**, and are the part genuinely closed off: an unfurler that
runs no JavaScript cannot be reached by any client-side technique, inline script
included. Only markup in the shipped HTML reaches it, and per-route markup means
SSR or prerendering — which is the decision this ADR makes against.

Recorded so PRD #39's story 73 is not read as fully delivered. See #125, which
amends that story.

Revisit if routing needs grow (nested layouts, code-split routes, typed params,
scroll restoration) enough to outweigh a small library, or if SSR/SSG ever
becomes a committed requirement — at which point choose a router deliberately
with more information than we have today.
