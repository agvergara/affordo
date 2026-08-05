# Working agreements

For anyone — human or agent — changing this repository. These are not style
preferences. Each one is here because ignoring it cost something, and the cost is
named so you can judge whether it still applies.

## What this project is

A client-only rebuild of a reference design to a strict fidelity bar. The
reference is the authority; this codebase is a reproduction of it.

- **The reference is readable.** `agvergara/dream-purchase-planner`, via
  `gh api repos/agvergara/dream-purchase-planner/contents/<path> --jq '.content' | base64 -d`.
  If a question is about what the app should do or look like, read the reference
  rather than reasoning about it.
- **The fidelity bar** is in PRD issue #39, amended by
  [ADR 0022](docs/adr/0022-fidelity-bar-stops-at-the-perceivable.md): pixel-for-pixel
  and behaviour-for-behaviour, _"if it looks like a mistake, it is a requirement"_ —
  governing everything a sighted mouse user can perceive. Accessibility semantics
  may diverge; interactive targets meet 24×24 regardless.
- **`docs/affordo-context.md`** is the extraction of the reference. Read its
  coverage table before relying on it.

## The five rules that were learned the hard way

### 1. Copying a `className` is not fidelity

The reference composes shadcn components. Their base layers contribute classes
that survive tailwind-merge and **appear in no source you can read**. Four
separate PRs shipped a byte-identical class string and rendered it wrong:

| control             | string-faithful  | reference        |
| ------------------- | ---------------- | ---------------- |
| `/goals` add button | 58.5px           | 40px             |
| `/settings` inputs  | 50px @ 24px type | 36px @ 14px type |
| wizard CTA          | 65px             | 48px             |
| wizard Back         | no box at all    | 36px             |

Before claiming a control matches, **construct the reference's merged class
string and measure both in a browser.** `h-9` and `md:text-sm` are the usual
culprits: a route string that sets padding but no height keeps the base's `h-9`,
and `text-2xl` displaces `text-base` but not `md:text-sm`.

### 2. Silence in the extraction is not evidence about the reference

PR #102's review reasoned from the dossier's silence that a footer's `opacity-50`
was invented, removed it, and shipped a regression that survived a full review
because the premise looked authoritative. The reference had it all along (#104).

When the dossier does not mention something, **read the reference**. Do not
conclude it does not exist.

### 3. The unit suite cannot see anything visual

jsdom applies no stylesheet. 454 green tests prove nothing about geometry,
colour, focus rings, hit targets or layout. Anything visual is pinned by an e2e
test measuring the real thing, or it is not pinned.

Class assertions in unit tests are allowed under a narrow exception (PR #94):
when colour or geometry _is_ the requirement and the class is the only
observable. Say so in a comment when you use it.

### 4. Assert one class per `.not.toHaveClass`

`expect(el).not.toHaveClass("a", "b")` passes when **either** is absent. Six
assertions written that way asserted almost nothing, including one named
"renders Try again solid and Go home outline" that did not test the outline half.

Split them: one class per call.

### 5. Mutation-verify, and check the mutation is real

A test that does not fail when the behaviour breaks is worse than no test — it
advertises coverage it does not have. Change the source so the defect you are
guarding against is real, and confirm the suite goes red.

Two failure modes to watch for, both of which have happened here:

- **The test re-derives the logic it is testing.** A trailing-slash test
  reimplemented the path normalisation in the test body, so deleting it from the
  source left the test green. Execute the real thing.
- **The mutation is invalid.** Two mutants "survived" a hit-target test because
  neither actually reproduced the condition. Before concluding a test is weak,
  confirm the mutation produces the defect.

## Review

Every PR gets a fresh-eyes review from someone who did not write it. Findings are
mutation-verified before they are reported; a finding that cannot be demonstrated
is not reported.

If independent review is unavailable, **say so on the PR**. Self-review is not a
substitute, and labelling it as one is the part that does damage. PRs #140–#144
and #147 carry that caveat.

## Conventions

- **Branches**: `<type>/<slug>` off `main`. Never commit to `main` directly.
- **Never `git add -A`.** `.claude/` is now ignored, but the habit that swept 21
  embedded git repos into a commit twice was `-A`. Stage explicit paths.
- **Prettier writes only the files you edited.** Several test files are not
  prettier-clean on `main`; running it across a glob produces reformat churn
  unrelated to your change. Revert what you did not mean to touch.
- **Commit messages explain why**, including what was tried and rejected. The
  history here is the main record of reasoning that outlives an issue.
- **Superseded ADRs are kept and marked**, never deleted. Same for retired
  vocabulary in `CONTEXT.md`.

## Before opening a PR

```bash
npm run typecheck   # tsc --noEmit
npm test            # Vitest
npm run test:e2e    # Playwright
npm run build       # the inline-title plugin runs here and can fail the build
```

A PR body says what the change does, the acceptance criteria with the test that
proves each, and — most usefully — what a reviewer should attack. Point at the
weakest part of your own work; it is the part most likely to be wrong.
