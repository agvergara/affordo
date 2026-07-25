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

The aesthetic uses distinctive faces, but Affordo's pitch is "no network calls at
all." A Google Fonts `<link>` is a network call and would break that promise (and the
spirit of [ADR 0011](0011-plain-versioned-localstorage-no-encryption.md)'s privacy
stance). Therefore every face is **self-hosted** — subsetted `woff2` files bundled into
the static build and served from our own origin. No font is ever loaded from a CDN.

**Amendment (reference parity, issue #43).** Reproducing the reference design replaces
the single display face + system body stack with three named faces the reference loads
from Google Fonts: **Anton** (display, single weight 400), **Inter** (body, 400/500/600/700),
and **JetBrains Mono** (labels/mono, 400/500/700). We honor the no-CDN constraint by
importing them through Fontsource packages — `@fontsource/anton` and the variable
`@fontsource-variable/inter` / `@fontsource-variable/jetbrains-mono` — which bundle the
woff2 into the build exactly like the pre-existing Fraunces import. The `--font-*` stacks
list the Fontsource "… Variable" family name first (so the local file wins), then the
reference's own family name and system fallbacks. Body text now sets Inter with the
reference's `font-feature-settings: "ss01", "cv11"`.
