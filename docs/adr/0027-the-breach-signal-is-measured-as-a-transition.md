# The above-threshold signal is measured as a transition, not as a colour

**Status:** Accepted. Supersedes [ADR 0022](0022-fidelity-bar-stops-at-the-perceivable.md)
case 4 **for the goal card's threshold caption only**. Decided on
[#180](https://github.com/agvergara/affordo/issues/180), built on
[#181](https://github.com/agvergara/affordo/issues/181).

## Context

The goal card computes `aboveThreshold` correctly, has always computed it
correctly, and said so where nobody could see it. Reported from use as "I can't
tell the significance threshold is doing anything".

The engine was never at fault. `pctOfMonthlyIncome > threshold` is strict and
reference-verbatim, the settings slider reaches the card through the provider,
and 626 tests passed throughout. The flag's entire user-visible output was one
10px uppercase mono caption swapping `text-muted-foreground` → `text-accent`,
reproduced from `docs/reference-snapshot/src/components/affordo/GoalCard.tsx:59`.

ADR 0022 case 4 had already looked straight at this element and decided the
accent failures ship. It listed `--accent` as text on `--card` at 3.1:1 and
named "wizard kicker, goal-card caption — 10px mono". So this was not an
oversight; it was a decision. What made it the wrong decision is that every
number supporting it measured the same kind of thing:

| what case 4 measured                       | what it could not see                                  |
| ------------------------------------------ | ------------------------------------------------------ |
| text against its background, four pairings | whether the _change_ between two states is perceivable |

A flag is not a colour. It is a **difference between two states**, and no
ratio-against-background can express one. Measured as a transition, the
reference's flag is worse than nothing:

| theme | not breached | breached | delta     |
| ----- | ------------ | -------- | --------- |
| light | 7.44:1       | 3.10:1   | **−4.34** |
| dark  | 7.16:1       | 7.12:1   | **−0.04** |

**In light the alarm state is fainter than the calm state.** Firing the
threshold more than halves the caption's contrast, so the signal reads as
de-emphasis — the opposite of what it means.

**In dark the two states are luminance-identical.** This is the row that
settles it. Case 4 waved the dark theme through as _"light-only — the same
pairings clear AA under `.dark`"_, which is true, and true of both endpoints,
and therefore silent on the only question that matters here. At Δ0.04 the hue
is carrying the entire state change on 10px type, and it is not carrying it.

A colour that is doing no work is not worth reproducing. That is what makes
this divergence cheap rather than a trade: the design is not losing an accent
it had, because perceptually it never had one.

## Decision

**On the goal card's threshold caption, the above-threshold state is signalled
by word, weight and luminance — not by hue.**

|             | reference                                               | ours                                                              |
| ----------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| at or below | `Significance threshold: {n}%`, `text-muted-foreground` | identical                                                         |
| above       | `Significance threshold: {n}%`, `text-accent`           | `Above significance threshold: {n}%`, `font-bold text-foreground` |

Three channels replace one that failed: a word that survives greyscale and
colour blindness, a weight that survives both, and a contrast that now rises
instead of falling:

| theme | not breached | breached | delta      |
| ----- | ------------ | -------- | ---------- |
| light | 7.44:1       | 20.12:1  | **+12.68** |
| dark  | 7.16:1       | 18.31:1  | **+11.15** |

**Scope, stated narrowly because ADR 0022 is otherwise still in force:**

- `--accent` is **unchanged**, everywhere. The wizard kicker, every primary
  button hover and the `cutToAfford` badge keep it exactly as they were.
- The pinned expected failures in `src/styles/contrast.test.ts` **stay pinned**
  at the same ratios. ADR 0022's _"do not 'fix' them to make the suite greener
  — the numbers are the finding"_ is still right, and none of those numbers are
  what this ADR measures.
- The meter is untouched: fill `bg-foreground`, marker `bg-accent` at
  `Math.min(100, 50)`. Accent keeps its role on this card as the marker line.
- The engine is untouched. A goal at exactly the threshold is still calm.

Per [ADR 0023](0023-net-new-surface-governed-by-reference-idiom.md), every part
used here is already extracted from the reference — `text-foreground`,
`font-bold` and the caption string are all on this card already. No new parts.

## The guard is the durable half

The fix is four classes. The reason this went unnoticed through a dedicated
contrast audit (#71), a five-case accessibility decision (#145) and a full
parity rebuild is that **nothing in the suite could fail when a flag stopped
flagging**:

- `contrast.test.ts` measured each state's legibility. Both endpoints passed in
  dark; the light endpoint was a _known pinned failure_, so the suite asserted
  the bad number was there on purpose.
- The unit layer asserted `toHaveClass("text-accent")`. It passed. The class was
  correct — jsdom applies no stylesheet, so the class is the whole of what it
  can see, and a correct class resolving to an invisible colour is exactly the
  blind spot `CLAUDE.md` warns about.

So two guards were added:

1. `contrast.test.ts` now asserts the **transition**: breached ≥ calm, and a
   step of more than 1.0 of contrast, in _both_ themes. Reverting the component
   reproduces −4.34 and −0.04 and fails four ways.
2. `e2e/threshold-flag.spec.ts` measures **painted** weight and luminance in a
   real browser, and asserts `.dark` actually applied before measuring under it.
   Reverting the component catches weight 400 and 0.0006 of luminance separation
   in dark; stubbing out the OS-theme fallback fails the class assertion instead
   of quietly re-measuring the light theme.

**The first version of guard 1 did not work, and how it failed is the most
useful thing in this ADR.** It compared two hard-coded token names, so it
measured its own opinion of what the component did rather than the component.
Reverting `GoalCard.tsx` to `text-accent` left all 45 tests in the file green.
It had been "verified" by reverting the test's own constant — which proves only
that arithmetic is arithmetic. A duel reviewer on #182 caught it by mutating the
component instead; the tokens are now parsed out of the caption's ternary, so
the guard follows the code it guards.

That is this ADR's own thesis landing on it: a guard that cannot fail is worth
nothing, whatever it asserts, and the only way to know which kind you have is to
break the thing on purpose and watch.

## The longer string reflows, and that is accepted

A longer caption wraps sooner, so a breached card can be taller than a calm one.
Measured on the two-goal fixture:

| viewport | breached card | calm card | caption lines                     |
| -------- | ------------- | --------- | --------------------------------- |
| 375px    | 512px         | 512px     | both wrap — no difference         |
| 414px    | 488px         | 473px     | **breached wraps, calm does not** |
| 430px    | 488px         | 473px     | **breached wraps, calm does not** |
| 768px    | 425px         | 425px     | neither wraps                     |

So the 15px difference lives in a band roughly 400–450px wide, which includes
real devices (iPhone 14/15 Pro Max). It is accepted rather than designed out:

- Cards in this list already differ in height — the note is optional, names
  truncate at different lengths, verdict explainers run to different lengths. A
  varying card height is not a new property of the dashboard.
- It is not a layout _shift_. The state changes only when the goal or the
  threshold is edited, never spontaneously during a read.
- The obvious prevention is worse. `whitespace-nowrap` on the caption would stop
  the wrap in this band and cause overflow below it — at 375px _both_ captions
  already wrap, so forcing one line there trades a 15px height difference for
  clipped or horizontally-scrolling text.

Recorded here because a future reader measuring two cards at 414px should find
this paragraph rather than file a bug.

## Consequences

- One recorded divergence from the reference, in `docs/affordo-context.md` §6b.
- ADR 0022 case 4 stands everywhere else. This does not reopen the palette, and
  it is not licence to "improve" a reference colour: the argument here is that a
  specific signal was measurably absent, not that a colour was ugly.
- The transition metric generalises. Any future state carried by colour alone
  should be measured this way, and `contrast.test.ts` can now express it.
- `aboveThreshold` still has one consumer. The dashboard prints the threshold
  and never says whether anything breaches it — noted as out of scope on #181,
  since that is new surface with its own placement question.

## Alternatives considered

**Keep the hue and add weight only** (`font-bold text-accent`). Preserves the
reference's colour. Rejected: it leaves the light-theme caption at 3.1:1 — the
AA failure ADR 0022 already flagged as the first thing that has to give — and
the dark theme still turns on a Δ0.04 hue change. Bolder illegible text.

**Fix `--accent` itself.** Would repair every failure in case 4 at once.
Rejected outright: it changes the product the PRD exists to reproduce, on every
screen, and ADR 0022 settled it deliberately.

**Turn the meter fill accent on breach.** A much larger colour area, and it
tested well. Rejected on two counts — it is a second divergence where one
suffices, and the fill passes the marker exactly when the threshold is
breached, so an accent fill would swallow the accent marker at the moment the
marker becomes interesting.
