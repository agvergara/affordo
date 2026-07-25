# Tailwind CSS v4 for styling, against the zero-config ethos

The v1 UI shipped as an unstyled HTML form. The redesign styles it with **Tailwind
CSS v4** (CSS-first: a single `@import "tailwindcss"`, design tokens declared in
`@theme`, the Vite plugin — **no `tailwind.config.js`**). This is recorded because it
was chosen *deliberately against* the project's stated ethos, and unwinding it later
would be costly.

## The tension

The README boasts "No runtime dependencies beyond React. Nothing to configure." Two
alternatives honored that literally:

- **Plain CSS + custom-property tokens (CSS Modules)** — zero dependencies, zero
  config, full control. The recommended option for a one-screen app.
- **A component library (MUI/Chakra)** — rejected outright: it adds *runtime* weight
  and breaks the "React is the only runtime dep" promise.

We picked Tailwind anyway.

## Why

- **It does not break the runtime-deps promise.** Tailwind is a build-time tool: it
  compiles to plain CSS and ships no JavaScript. React remains the only runtime
  dependency — the README claim is preserved, reworded.
- **v4 minimizes the config we traded away.** CSS-first means no `tailwind.config.js`
  and no PostCSS hand-wiring; tokens live in one `@theme` block and double as
  utilities *and* CSS variables, which fits the warm-editorial token set
  (`--color-*`, `--space-*`, type scale) the redesign needs.
- **Velocity on a growing surface.** The redesign decomposes the monolith into staged
  components (income, savings, expenses, the Time Cost hero, verdict/challenge cards);
  utilities keep styling colocated with markup as that surface grows.

## Cost we accepted

- "Nothing to configure" is no longer strictly true; the README was updated to say so.
- Utility classes spread across every component, so **reversing this decision is
  expensive** — that is precisely why it is an ADR.

## Derived constraint: self-hosted fonts, never a CDN

The warm-editorial aesthetic uses a distinctive display face, but Affordo's pitch is
"no network calls at all." A Google Fonts `<link>` is a network call and would break
that promise (and the spirit of [ADR 0011](0011-plain-versioned-localstorage-no-encryption.md)'s
privacy stance). Therefore the display font is **self-hosted** — a subsetted `woff2`
bundled into the static build — and body text uses the system font stack. No font is
ever loaded from a CDN.

## Amendment (issue #44): reference oklch token layer

The parity rebuild (#39) migrates onto a shadcn/new-york **oklch semantic token
set** (`--background`/`--foreground`/`--card`/`--muted`/`--accent`/`--border`/… with
light `:root` and latent `.dark` twins). Issue #44 lands that palette *additively*:

- The reference tokens and their `@theme inline` `--color-*` aliases now back the
  standard utilities (`bg-background`, `text-foreground`, `border-border`, `bg-card`,
  `bg-accent`, `text-muted-foreground`, `ring`, …).
- The legacy warm-editorial tokens (`--canvas`/`--ink`/`--stone` and the verdict
  tones) **stay defined** so components that still read `bg-canvas`/`text-ink`/`stone`
  keep resolving; the three shared roles (`--accent`/`--card`/`--border`) take their
  reference oklch values. Accent (terracotta → orange) and card (white → white) read
  essentially unchanged; **`--border` intentionally shifts** — opaque warm cream
  (`#e7decf`) → translucent near-black (`oklch(0.13 0 0 / 15%)`), the reference's
  fainter, cooler hairline — on every existing `border-border`/form edge. That is an
  intended step toward parity, not an accidental regression.
- `.dark` is fully defined but **latent** — no toggle applies the class in this slice;
  the auto `prefers-color-scheme` block is retained for the legacy tokens. A theme
  toggle is a later slice.

This coexistence is deliberate and temporary: once every component references the
reference names, the legacy aliases can be removed.
