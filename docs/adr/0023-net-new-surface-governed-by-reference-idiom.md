# Net-new surface is governed by reference idiom, not reference pixels

Status: accepted.

## Context

`AGENTS.md` opens with "the reference is the authority; this codebase is a
reproduction of it", and rule 2 hardens that into "unknown is not permission to
invent". Both assume the thing being built exists in the reference.

Cross-goal contention (ADR 0024) does not. There is no snapshot file to measure
against, no merged shadcn class string to construct, and no section of
`docs/affordo-context.md` to consult — every mechanism this repo has for
deciding "is this right?" returns _unknown_, and rule 2 says unknown means stop.
Taken literally, the working agreements make net-new features unbuildable and
unreviewable, which is not what they were written to do: they were written to
stop four PRs shipping wrong geometry by copying a class string, not to freeze
the product.

The reference was also never the whole story. The theme toggle already ships
with no reference original — dossier §10 records dark mode as "latent/unreachable
via UI", ADR 0021 put it in scope, and `AppHeader.tsx:70-85` resolves the gap by
borrowing the Settings link's treatment so it reads as part of the same group.
That is the precedent this ADR generalises.

## Decision

**The fidelity bar continues to govern, unchanged, every surface the reference
has. Surface the reference does not have is built only by composing primitives
already extracted from it** — the button and input base layers quoted in
`AGENTS.md`, the token palette, the card and dialog patterns, the existing
typography scale. New composition of proven parts is permitted; new parts are
not.

The reviewable question becomes "does every element here trace to a snapshot
primitive?", which is answerable, rather than "does this match the reference?",
which is not.

Net-new surface must also read as the same app. Where the reference offers no
guidance on placement or emphasis, the closest existing analogue governs — as
the theme toggle took the Settings link's muted-to-foreground treatment rather
than inventing a header style.

## Considered options

- **Declare the fidelity bar v1-scoped and design v1.1 freely.** Rejected: it
  splits the app into two design regimes with no rule about where the boundary
  runs, and the drift would be permanent and invisible.
- **Add no new surface — express everything through existing components.**
  Rejected as a general rule: it would have forced cross-goal contention onto
  `GoalCard`, which is the one place ADR 0024 most wanted to keep untouched.

## Consequences

Rule 2's "silence means unknown" still applies to everything the reference
covers; this ADR does not loosen it. It carves out only the case where the
reference is silent because the feature did not exist, which is distinguishable
from the case where the reference is silent because the dossier is not
exhaustive there — and the distinction is whether the feature appears in
`docs/reference-snapshot/` at all.

Reviews of net-new surface should ask for the primitive each element derives
from. An element with no such derivation is the finding.
