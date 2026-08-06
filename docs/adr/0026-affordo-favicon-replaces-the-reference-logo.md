# The favicon is an Affordo mark, not the reference's

Status: accepted.

## Context

A favicon is perceivable, so [ADR 0022](0022-fidelity-bar-stops-at-the-perceivable.md)
puts it squarely inside the fidelity bar, and the reference's own is what this
repo has shipped since #128 — verified byte-identical at the time.

The reference is a Lovable-generated template, and its favicon is **Lovable's
logo**. Affordo has no licence to ship another company's mark as its own
identity, which is not an aesthetic objection and cannot be resolved by
measuring anything.

## Decision

**Ship an Affordo mark: a flat-apex "A", knocked out of a solid square.** The
markup is untouched — still `<link rel="icon" href="/favicon.ico"
type="image/x-icon" />`, still one icon and no apple-touch-icon or manifest, as
PRD #39's Out of Scope requires. **The asset diverges; the reference's markup
does not.**

The mark is built from the app's own tokens rather than invented, per
[ADR 0023](0023-net-new-surface-governed-by-reference-idiom.md): `--accent`
(`#F3680F`) behind `--accent-foreground` (`#FBFAF9`), square-cornered — the exact
pairing and shape `VerdictBadge` already uses. It is the app's existing visual
language at 16px, not a new one.

Geometry lives in a 100×100 design box, recorded here so the icon can be rebuilt
without the file: limbs `(42,18)→(12,82)→(32,82)→(50,18)` and its mirror,
crossbar `x 28..72, y 55..65`, unioned so the counter is whatever they leave
uncovered. The crossbar height was chosen by rendering 16×16 candidates and
reading them: at `y 60..70` the legs below the bar collapse to about one pixel
and the glyph reads as a triangle with a line through it; at `52..62` the bar
merges into the counter. Shipped as a six-size `.ico` (16–256) so small sizes are
rendered rather than downscaled, 5,798 bytes against the previous 20,373.

## Consequences

**Preserving the reference asset was the load-bearing part of this change, not
the drawing.** `ARCHIVE.md` listed `public/favicon.ico` under "what was not
copied", on the explicit grounds that a byte-identical copy already lived in
`public/`. That made `public/favicon.ico` the _only_ surviving copy of the
reference's favicon, since the reference repository is deleted. Overwriting it
would have destroyed evidence the archive exists to hold, and nothing in the
tooling would have said a word.

The reference asset is therefore archived at
`docs/reference-snapshot/public/favicon.ico` before the replacement landed, and
the `ARCHIVE.md` entry is corrected with the reason. The general form of the
mistake is worth remembering: **"already in the repo" is not a preservation
strategy** — it holds only until the repo changes its mind.

This is a divergence from the reference that is **correct and must not be
"fixed"**. A future reader comparing against the archive will find the icons
differ and that everything else reproduces faithfully; restoring the reference
favicon for parity would reintroduce a licensing problem, not close a gap.
