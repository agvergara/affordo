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

Revisit if routing needs grow (nested layouts, code-split routes, typed params,
scroll restoration) enough to outweigh a small library, or if SSR/SSG ever
becomes a committed requirement — at which point choose a router deliberately
with more information than we have today.
