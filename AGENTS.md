# Working agreements

For anyone — human or agent — changing this repository. These are not style
preferences. Each one is here because ignoring it cost something, and the cost is
named so you can judge whether it still applies.

## What this project is

A client-only rebuild of a reference design to a strict fidelity bar. The
reference is the authority; this codebase is a reproduction of it.

- **The fidelity bar** is in PRD issue #39, amended by
  [ADR 0022](docs/adr/0022-fidelity-bar-stops-at-the-perceivable.md): pixel-for-pixel
  and behaviour-for-behaviour, _"if it looks like a mistake, it is a requirement"_ —
  governing everything a sighted mouse user can perceive. Accessibility semantics
  may diverge; interactive targets meet 24×24 regardless.

## ⚠️ The reference no longer exists

`agvergara/dream-purchase-planner` was private and has been deleted. **Any
instruction in this repo's history to `gh api` it is dead** — commit messages, PR
bodies and older comments say "read the reference" and give a command that no
longer works.

**It is archived at [`docs/reference-snapshot/`](docs/reference-snapshot/)** — all
86 source files, verbatim, taken while access still held. Read that instead of
the `gh api` command. It is excluded from `tsc` and `prettier` on purpose: it is
evidence, and reformatting it would destroy the only property that makes it
useful.

`docs/affordo-context.md` is still the better _starting_ point — it is organised
and says which of its sections are exhaustive. But the snapshot is what it was
derived from, and where the two disagree the snapshot wins.

### What the reference was

A Lovable-generated template, read-only, at `~/lovable/affordo_template/dream-purchase-planner`.

|             |                                                                          |
| ----------- | ------------------------------------------------------------------------ |
| Framework   | **TanStack Start** (file-based routing), React 19, TypeScript            |
| Styling     | Tailwind CSS **v4** (CSS-first `@theme`, no config file)                 |
| Components  | **shadcn/ui**, `new-york` style, with `cn()` = `clsx` + `tailwind-merge` |
| Toasts      | `sonner`                                                                 |
| Icons       | `lucide-react`                                                           |
| Persistence | `localStorage`, no backend                                               |

Five routes — `__root.tsx` (404 + error screens), `index.tsx` (redirect gate),
`onboarding.tsx`, `goals.tsx`, `settings.tsx` — and five components under
`components/affordo/`: `AppHeader`, `GoalCard`, `GoalDialog`, `OnboardingWizard`,
`VerdictBadge`. The `onboarding` and `index` routes are thin shims; their screens
live in the components.

This port differs by construction: **Vite + React 18, a hand-rolled router
([ADR 0018](docs/adr/0018-client-only-hand-rolled-router-no-ssr.md)), and no
shadcn, no lucide, no sonner, no tailwind-merge.** Every shadcn primitive is
reimplemented by hand, which is the source of rule 1 below.

### The base layers, quoted here because they are load-bearing

The reference composed shadcn components; this port writes plain elements. The
classes those components contributed **do not appear in any route source**, and
four PRs shipped wrong geometry by copying the route string alone. Quoted here
for convenience; the files are at
`docs/reference-snapshot/src/components/ui/`:

```
Button base:  inline-flex items-center justify-center gap-2 whitespace-nowrap
              rounded-md text-sm font-medium cursor-pointer transition-colors
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
              disabled:pointer-events-none disabled:opacity-50
              disabled:cursor-not-allowed
              [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0
Button size:  default "h-9 px-4 py-2" · sm "h-8 rounded-md px-3 text-xs"
              lg "h-10 rounded-md px-8" · icon "h-9 w-9"
Button ghost: hover:bg-accent hover:text-accent-foreground
Button dflt:  bg-primary text-primary-foreground shadow hover:bg-primary/90

Input:        flex h-9 w-full rounded-md border border-input bg-transparent
              px-3 py-1 text-base shadow-sm transition-colors
              placeholder:text-muted-foreground focus-visible:outline-none
              focus-visible:ring-1 focus-visible:ring-ring
              disabled:cursor-not-allowed disabled:opacity-50 md:text-sm

Textarea:     flex min-h-[60px] w-full rounded-md border border-input
              bg-transparent px-3 py-2 text-base shadow-sm
              placeholder:text-muted-foreground focus-visible:outline-none
              focus-visible:ring-1 focus-visible:ring-ring
              disabled:cursor-not-allowed disabled:opacity-50 md:text-sm

Label:        text-sm font-medium leading-none
              peer-disabled:cursor-not-allowed peer-disabled:opacity-70
```

`cn()` merges a route's `className` **over** these, so a class only disappears if
the route names the same property. `h-9` survives a route that sets padding but no
height; `md:text-sm` survives `text-2xl`, because a `md:` variant is a different
key. That is the whole of rule 1.

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

### 2. Silence in the extraction is not evidence — and is now unresolvable

PR #102's review reasoned from the dossier's silence that a footer's `opacity-50`
was invented, removed it, and shipped a regression that survived a full review
because the premise looked authoritative. The reference had it all along (#104).

The fix then was "read the reference". **That escape hatch is gone** — see above.
So the rule hardens rather than relaxes:

- The dossier's coverage table tells you which sections are exhaustive. Inside
  those, silence _is_ meaningful. Outside them, it means **unknown**.
- Unknown is not permission to invent, and not permission to delete. An element
  the dossier does not mention and the code already has was put there by someone
  who could still read the reference. Leave it, unless you can show it is wrong.
- **`docs/reference-snapshot/` answers most of it.** The archive is complete, so
  a question the dossier does not cover is usually still answerable — just from
  the snapshot rather than a live fetch.

If parity work needs something neither the snapshot nor the dossier records, say
so and stop. Guessing produces a value that looks researched and is not.

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
