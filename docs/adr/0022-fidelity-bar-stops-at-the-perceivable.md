# The fidelity bar governs what is perceivable; accessibility semantics may diverge

**Status:** Accepted. Amends the fidelity bar in PRD [#39](https://github.com/agvergara/affordo/issues/39). Decided on [#145](https://github.com/agvergara/affordo/issues/145).

PRD #39 sets the bar for this rebuild:

> **Fidelity bar:** pixel-for-pixel and behaviour-for-behaviour with the reference. Nothing is improved, simplified, modernized, or tidied. If it looks like a mistake, it is a requirement.

It says nothing about accessibility, and the parity rebuild hit that gap five times. This ADR closes it.

## Decision

**The fidelity bar governs everything a sighted mouse user can perceive. Where the reference's markup is invisible to them but load-bearing for assistive technology, this port may diverge — and must record the divergence in `docs/affordo-context.md` §6b. Interactive targets meet 24×24 CSS pixels regardless.**

## What that resolves

| #   | case                                                        | resolution                         |
| --- | ----------------------------------------------------------- | ---------------------------------- |
| 1   | `/settings` labels: reference has no `htmlFor`/`id` pairing | **diverge** — keep ours associated |
| 2   | `/goals` list: reference is `<div>`, ours `<ul>`/`<li>`     | **diverge** — keep ours            |
| 3   | `__root`: reference is `<div>`, ours `<main>`               | **diverge** — keep ours            |
| 4   | palette fails WCAG AA in four places                        | **reproduce** — the failures ship  |
| 5   | no agreed hit-target floor                                  | **24×24 adopted**                  |

Cases 1–3 cost nothing visually. This was checked, not assumed: Tailwind's preflight zeroes `margin`/`padding` on every element and sets `list-style: none`, so `<ul>` and `<div>` render byte-identically here, and `<main>` and `<div>` always did. Reproducing the reference in those three places would trade real assistive-technology behaviour — a "list, 3 items" announcement, a landmark, nine labelled fields — for no visible difference at all.

Case 1 also carries a concrete cost the others do not: **123 assertions** (113 unit, 10 e2e) query by label. Reproducing the reference would mean rewriting all of them against weaker selectors, on the app's most complex form.

## Why case 4 goes the other way

Colour is not incidental to this reference; it is most of what the rebuild is _for_. The failures are visible to everyone and central to the design:

| pairing                              | ratio  | AA  | where                                           |
| ------------------------------------ | ------ | --- | ----------------------------------------------- |
| `--accent-foreground` on `--accent`  | 2.96:1 | 4.5 | every primary button hover, `cutToAfford` badge |
| `--accent` as text on `--background` | 2.96:1 | 4.5 | wizard kicker, goal-card caption — 10px mono    |
| `--accent` as text on `--card`       | 3.1:1  | 4.5 | as above                                        |
| white on `emerald-600`               | 3.77:1 | 4.5 | afford badge, **both** themes                   |

The accent failures are **light-only** — the same pairings clear AA under `.dark` — and light is the default theme.

This is the uncomfortable half of the decision and is recorded as such rather than justified away. `src/styles/contrast.test.ts` pins each ratio as an **expected failure**, so the suite asserts the app is inaccessible here rather than quietly passing. If this project ever takes on an accessibility commitment, accent-as-text at 2.96:1 on 10px type is the first thing that has to give.

## Why 24×24 is free

The rule costs nothing because the reference's own components already clear it — shadcn's `size="sm"` ghost is `h-8` (32px). Reproducing the reference and meeting the floor agree everywhere measured.

The three failures found were places nobody had reproduced anything: the header's two links (54×17, 56×15) and the goal dialog's close button (12×24). All three were fixed without moving a pixel — the header links take `-my-2 py-2` inside an `h-14` row that centres them, and the close button became 24×24 at `right-3 top-3`, which lands its glyph 26px from each panel edge, exactly where the reference's 16×16 button centres its own.

Note the reference's close button is 16×16 — itself under the floor. This is the one place the rule makes us _better_ than the reference in something visible, and the visible part (glyph position) is unchanged.

## Why a rule rather than case-by-case

The project had already applied opposite standards to the same finding: the duel on [#95](https://github.com/agvergara/affordo/issues/95) treated a 16×16 toggle under the 24×24 floor as a finding and fixed it; the duel on [#97](https://github.com/agvergara/affordo/issues/97) declined the same finding on a 112×15 button. That is not a disagreement about facts. It is what happens when reviewers have to invent a policy per PR.

## Consequences

- Five divergences are now decisions rather than deferrals, recorded in §6b.
- `e2e/target-size.spec.ts` sweeps every interactive control on every route and in the dialog. A sweep, not per-element assertions: all three failures were in components nobody had thought to check, and per-element tests only cover what someone already suspects.
- The AA failures stay pinned as expected failures. **Do not "fix" them to make the suite greener** — the numbers are the finding.
- This does not license divergence in general. It licenses it where the reference's markup is imperceptible to a sighted mouse user _and_ load-bearing for assistive technology. Behaviour that merely looks like a mistake is already covered by #39's bar and must be reproduced — see [#136](https://github.com/agvergara/affordo/issues/136), which was wrongly deferred under this heading and then closed by reproducing the reference.

## Alternatives considered

**The bar reaches everything; reproduce all five.** Maximum fidelity, and internally consistent. Rejected on cost: nine unlabelled fields, no list semantics, no landmarks on two screens, and 123 assertions rewritten — all for zero visible difference.

**The bar stops at visual and behavioural; fix all five.** Simpler to apply. Rejected because it means changing the palette, which visibly changes the product the PRD exists to reproduce.
