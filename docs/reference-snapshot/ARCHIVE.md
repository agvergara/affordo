# Reference snapshot — read-only archive

> **`README.md` in this directory is the reference's own file, not a description
> of this archive.** Everything here is verbatim; this file is the only addition.

Verbatim copy of **`agvergara/dream-purchase-planner`**, the reference design
this app was rebuilt to reproduce (PRD issue #39).

That repository was private and has been deleted. This is the only surviving
copy, taken from `main` (last pushed `2026-07-24T12:25:10Z`) while access still
held.

## This is evidence, not source

- **Nothing here is built, compiled, linted or tested.** `tsconfig.json` scopes
  to `src`, and `.prettierignore` excludes this directory — deliberately.
  Reformatting it would destroy the one property that makes it useful: that it
  is byte-identical to what the port was built against.
- **Do not import from it.** Different stack entirely (TanStack Start, React 19,
  shadcn/ui, lucide, sonner, tailwind-merge); none of those are dependencies
  here.
- **Do not "fix" it.** Its bugs are the specification. `--accent` at 2.96:1, a
  16×16 close button, a `flex-1` hairline that renders 0px wide — all reproduced
  on purpose. See [ADR 0022](../adr/0022-fidelity-bar-stops-at-the-perceivable.md)
  for what may diverge and what may not.

## What it is

A Lovable-generated template. 86 files, 452K.

| | |
| --- | --- |
| Framework | TanStack Start (file-based routing), React 19, TypeScript |
| Styling | Tailwind CSS v4, CSS-first `@theme`, no config file |
| Components | shadcn/ui `new-york`, `cn()` = `clsx` + `tailwind-merge` |
| Toasts / icons | `sonner` / `lucide-react` |
| Persistence | `localStorage`, no backend |

## Where to look

| you want | read |
| --- | --- |
| a screen's markup | `src/routes/{goals,settings,onboarding,index,__root}.tsx` |
| a component | `src/components/affordo/` — `AppHeader`, `GoalCard`, `GoalDialog`, `OnboardingWizard`, `VerdictBadge` |
| **why a control renders at a size no route explains** | `src/components/ui/{button,input,textarea,label}.tsx` — the base layers |
| the engine | `src/lib/affordability.ts`, `src/lib/affordo-types.ts` |
| copy | `src/lib/i18n.ts` |
| tokens | `src/styles.css` |
| money formatting | `src/lib/format.ts` |

The base layers in `src/components/ui/` are the highest-value part of this
archive. `cn()` merges a route's `className` **over** them, so a base class
survives unless the route names the same property — which is why `h-9` outlives
a route that sets padding but no height, and `md:text-sm` outlives `text-2xl`.
Four PRs shipped wrong geometry by reading only the route file. See `AGENTS.md`,
rule 1.

## What was not copied

- `bun.lock` — 169K, regenerable, says nothing about the design.

### `public/favicon.ico` — copied late, and only just in time

This entry used to read "already in this repo at `public/favicon.ico`, verified
byte-identical when it was ported (#128)", and that was true until the app
stopped shipping it.

The reference favicon is Lovable's own logo. Affordo has no licence to it, so it
was replaced with an Affordo mark
([ADR 0026](../adr/0026-affordo-favicon-replaces-the-reference-logo.md)) — and
because this file had been *deliberately not copied* on the grounds that a copy
already existed in `public/`, overwriting `public/` would have destroyed the last
one. The reference asset is now archived here properly, at
`public/favicon.ico`, before the replacement landed.

The general lesson, for anyone extending this archive: **"already in the repo" is
not a preservation strategy.** It holds only until the repo changes its mind, and
nothing warns you when it does. The `bun.lock` entry above is safe for a
different reason — it is regenerable — which is the only reason an omission here
is ever safe.

SHA-256 `dd821076a9b03adc2173c93956226aea3d92482d7578fc4339c5d3a2e9c24586`,
20,373 bytes, matching what `main` shipped up to that point.

Everything else in the repository is here, including config, the generated
`routeTree.gen.ts`, and Lovable's own `.lovable/` metadata.

## Relationship to `docs/affordo-context.md`

The dossier is an *extraction*: organised, annotated, and honest about which of
its sections are exhaustive. It remains the better starting point.

This snapshot is what the dossier was derived from, and it is what settles a
disagreement. Where the two conflict, **this wins** — the dossier has been wrong
before, including one fabricated row asserting a divergence between two files
that were byte-identical.
