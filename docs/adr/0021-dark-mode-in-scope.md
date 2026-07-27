# Dark mode is in scope, reversing the light-only decision

The parity rebuild shipped a fully-tokenized `.dark` palette but never applied the
class: the app was **light-only**, dark mode **latent and unreachable via UI**
(dossier §3, and [ADR 0014](0014-tailwind-v4-utility-styling.md)'s #44 amendment,
which states plainly *"no toggle applies the class in this slice … A theme toggle is
a later slice"*). The dossier's open question §17.3 asked directly: *"Ship light-only,
or wire a toggle?"*

This ADR records the answer: **dark mode is now in scope.** Issue #70 lands the theme
**state** — the layer that applies/removes `.dark` and persists the preference — and
this reversal is landed alongside it, as the issue requires.

## The reversal

- **Was:** the `.dark` block, `@custom-variant dark`, and `dark:` utilities existed but
  were dead weight — defined for a future that had not been committed to. The shipping
  app could only ever paint light.
- **Now:** dark mode is a supported theme. A persisted light/dark preference drives the
  `dark` class on the document root, turning the latent tokens into a live theme that
  survives reloads.

## Why reverse it

- The palette, the variant, and the `dark:` classes were **already built and carried**
  (#44). Leaving them permanently unreachable is pure cost with no payoff; wiring them
  up realizes work already paid for.
- A persisted theme is a low-risk, self-contained addition: it touches no engine logic,
  no verdict computation, and no financial state. It is a document side effect plus one
  localStorage key.

## What #70 lands, and what it deliberately does not

**In this slice:**

- `src/state/theme-store.ts` — a versioned `affordo.theme` localStorage record
  (`"light"`/`"dark"`), with the same defensive load as `profile-store` (degrades to the
  `light` default on absent/unparseable/foreign-schema/unknown-value records; ADR 0011,
  ADR 0019).
- `src/state/ThemeProvider.tsx` / `useTheme` — mirrors the `AffordoProvider` pattern,
  mounted outermost in `src/ui/Router.tsx`. It initializes from the stored value and
  keeps the `dark` class on `document.documentElement` in sync. The theme is read
  **synchronously** at construction (not deferred to a post-mount effect like Affordo's
  hydration), because the class is a paint-time document side effect — deferring it would
  flash the light theme on a dark reload.

**Explicitly deferred (later slices):**

- **No toggle UI** — nothing in the app lets a user *change* the theme yet; that is a
  separate slice (#72).
- **No system-preference logic** — `prefers-color-scheme` does not seed or override the
  stored choice in this layer; that is a separate slice (#73). The legacy
  `@media (prefers-color-scheme: dark)` block in `theme.css` is untouched and continues
  to drive only the legacy warm-editorial tokens, as before.

## Cost accepted

- The app now has two dark paths coexisting: the new class-based `.dark` (driven by the
  persisted preference) and the legacy `prefers-color-scheme` media block (driving only
  the legacy `--canvas`/`--ink`/`--stone`/verdict tokens). This is the same temporary
  coexistence ADR 0014's #44 amendment already flagged; it resolves as components finish
  migrating to the reference token names.
- Once the toggle (#72) and system-preference (#73) slices land, this decision is load-
  bearing for a user-visible feature and is not cheaply reversible — which is why it is
  an ADR.
