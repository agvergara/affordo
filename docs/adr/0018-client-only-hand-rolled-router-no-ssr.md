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

Choosing no SSR costs one thing worth naming, because it is invisible until
someone shares a link. Per-route `<title>`/`description`/`og:*` are written at
runtime by `src/ui/documentHead.ts` (#111), and **unfurlers do not execute
JavaScript** — Slack, iMessage, WhatsApp, Twitter and search crawlers all read
only the shipped `index.html`. So every shared link, whatever screen it points
at, unfurls with the root card: `Affordo — Audit: Life/Cost`.

Tabs are unaffected: a browser runs the JS before it paints the tab label, so
client-side is the only delivery a tab label has ever needed.

This is not a defect to fix here. Fixing it means SSR or prerendering, which is
the decision this ADR makes against — and the cost is mild, since a `/goals`
link unfurling as the app's own name is wrong rather than misleading. It is
recorded so that PRD #39's story 73 ("so that tabs **and shares** are labelled")
is not read as fully delivered. See #125.

Revisit if routing needs grow (nested layouts, code-split routes, typed params,
scroll restoration) enough to outweigh a small library, or if SSR/SSG ever
becomes a committed requirement — at which point choose a router deliberately
with more information than we have today.
