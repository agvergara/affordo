# Affordo — Reference Context Dossier

Extracted verbatim from the read-only Lovable reference source at
`~/lovable/affordo_template/dream-purchase-planner`.
Stack: **TanStack Start** (not plain Vite + react-router) + React 19 + TypeScript +
Tailwind CSS **v4** + shadcn/ui (new-york style). Completeness and literal accuracy
are prioritized over brevity. Anything undeterminable is under OPEN QUESTIONS.

> ✅ Reference structural note: this reference is a file-based-routed multi-page app with a
> 4-step wizard. Per TARGET CONSTRAINTS (v2) at the end of this document, the rebuild
> reproduces that structure **in full** — router, routes, wizard, step counter, and Back/Start
> controls are all in scope.

> ⚠️ **What this dossier does and does not cover** (#127, and read this before
> reasoning from an absence). **Silence here is not evidence about the
> reference.** Some sections are exhaustive and some are samples, and the
> difference is not visible from the writing:
>
> | section | coverage |
> | --- | --- |
> | §5 components, §16 wizard steps | **exhaustive** — character-perfect teardowns |
> | §6 copy, §1 head | **exhaustive** for the keys listed |
> | §6b route bodies | the **rendered** body of each of the five routes; guard and loading branches are **not** covered — see the note under §6b |
> | §3 tokens, §4 typography | **exhaustive** for the token set |
> | everything else | **sample** — assume nothing from omission |
>
> This warning exists because it has already cost something. PR #102's duel
> reasoned from this document's silence that the `/goals` footer's `opacity-50`
> was invented, removed it, and shipped a regression that survived a full duel
> because the premise looked authoritative. The reference had it all along
> (#104). When the dossier does not mention an element, the correct next step is
> to read `agvergara/dream-purchase-planner` — reachable via `gh api` — not to
> conclude the element does not exist.

---

## 1. PRODUCT IDENTITY

- **App name / brand wordmark:** `Affordo` (i18n key `brand`). Rendered as a wordmark in
  the header and elsewhere in **font-mono, uppercase, bold, tracking-widest, 11px** — i.e.
  it is set in JetBrains Mono, NOT in the display font. (`AppHeader.tsx:15-17`)
- **Tagline** (i18n key `tagline`, defined but **not rendered** anywhere in the routes):
  `Weigh purchases against your working hours.`
- **package.json name:** `tanstack_start_ts` (scaffolding name, not user-facing).

### Per-route `<title>` and `<meta>` strings

Root defaults (`src/routes/__root.tsx`, `head()`):
| tag | value |
| --- | --- |
| `charSet` | `utf-8` |
| `viewport` | `width=device-width, initial-scale=1` |
| `title` | `Affordo — Audit: Life/Cost` |
| `meta[name=description]` | `Weigh purchases against your working hours. A private, local-first affordability calculator.` |
| `meta[property=og:title]` | `Affordo — Audit: Life/Cost` |
| `meta[property=og:description]` | `Weigh purchases against your working hours.` |
| `meta[property=og:type]` | `website` |
| `meta[name=twitter:card]` | `summary` |

Note the em-dash `—` in the title and the `Audit: Life/Cost` phrasing.

Route `/onboarding` (`src/routes/onboarding.tsx`):
| tag | value |
| --- | --- |
| `title` | `Set up · Affordo` |
| `description` | `Configure your financial profile once. Then weigh purchases in seconds.` |
| `og:title` | `Set up · Affordo` |
| `og:description` | `Configure your financial profile once. Then weigh purchases in seconds.` |

Route `/goals` (`src/routes/goals.tsx`):
| tag | value |
| --- | --- |
| `title` | `Goals · Affordo` |
| `description` | `See every purchase weighed against your working hours.` |
| `og:title` | `Goals · Affordo` |
| `og:description` | `See every purchase weighed against your working hours.` |

Route `/settings` (`src/routes/settings.tsx`):
| tag | value |
| --- | --- |
| `title` | `Settings · Affordo` |
| `description` | `Edit your financial profile and preferences.` |
| `og:title` | `Settings · Affordo` |
| `og:description` | `Edit your financial profile and preferences.` |

Route `/` has no `head()` — inherits root defaults only.
(The separator used in sub-page titles is a middle dot `·`, U+00B7.)

### Favicon / og:image

- Favicon: `<link rel="icon" href="/favicon.ico" type="image/x-icon" />` — file exists at
  `public/favicon.ico` (20,373 bytes). No SVG/PNG variants.
- **og:image: NONE.** No `og:image` meta tag and no image asset is referenced anywhere.
- No apple-touch-icon, no manifest.

---

## 2. SCREEN INVENTORY

File-based routing (TanStack Start). Routes live in `src/routes/`.

| File | URL | Purpose |
| --- | --- | --- |
| `index.tsx` | `/` | State router / redirect gate. No UI beyond a loading line. |
| `onboarding.tsx` | `/onboarding` | 4-step wizard to build the financial profile. |
| `goals.tsx` | `/goals` | Dashboard: profile snapshot + saved goals list + add/edit/remove. |
| `settings.tsx` | `/settings` | Edit profile fields; reset everything. |
| `__root.tsx` | (shell) | HTML shell, providers, Toaster, 404 + error boundaries. |

### Navigation flow

- **`/`** — reads context. While `!hydrated`: shows a centered `loading…` line. Once
  hydrated: `<Navigate to={hasProfile ? "/goals" : "/onboarding"} />`. `hasProfile` is
  true when `profile.salary > 0`.
- **`/onboarding`** — on finishing the last step, `setProfile(draft)` then
  `navigate({ to: "/goals" })`.
- **`/goals`** — guarded: if `!hasProfile` → `<Navigate to="/onboarding" />`. Header links
  to `/settings`; brand link goes to `/goals`.
- **`/settings`** — guarded the same way. "Save" toasts and stays. "Reset everything" (after
  `window.confirm`) clears profile + goals and `navigate({ to: "/onboarding" })`.
- **404** (`NotFoundComponent`) and **error boundary** (`ErrorComponent`) render full-screen
  states with links back to `/`.

### Onboarding wizard — the four steps individually

Component: `src/components/affordo/OnboardingWizard.tsx`. Single component, local `step`
state `0..3`. Header (`AppHeader`) shown with `showTimeValue={false}`. Layout container:
`<main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">`.

Persistent chrome across all steps:
- **Eyebrow** (above the big title): `onboardingTitle` = `Set up your reckoning`.
- **Big step title (h1):** `steps[step]` — the current step's label (see below).
- **Step counter (top-right):** `String(step + 1).padStart(2, "0") + " / " + String(steps.length).padStart(2, "0")` → renders `01 / 04`, `02 / 04`, `03 / 04`, `04 / 04`.
- **Progress bar:** a row of 4 equal segments (`h-1 flex-1`); segments with index `<= step`
  are `bg-foreground`, the rest `bg-border`. `aria-hidden`.
- **Step body** wrapped in `<div key={step} className="animate-slide-up space-y-8">` — the
  `key={step}` re-mounts and re-triggers the slide-up animation on each step change.
- **Footer nav** (`border-t border-border pt-6`, space-between):
  - **Back button** (left): `← ` + `back` (=`Back`). `variant="ghost"`, `disabled` when `step === 0`.
  - **Primary button** (right): label is `start` on step 0 (`Start`), `finish` on the last
    step (`Finish setup`), otherwise `continue` (`Continue`); always suffixed with ` →`.
    Disabled when `!canContinue`.

Step labels array: `[stepWelcomeLabel, stepIncomeLabel, stepExpensesLabel, stepRulesLabel]`
= `["Welcome", "Income", "Expenses", "Rules"]`.

**Step 0 — "Welcome"** (index 0; counter `01 / 04`; forward button `Start →`; Back disabled)
No inputs. Three stacked text blocks (`space-y-6`):
- **Kicker** (`welcomeKicker`): `Before you buy` — mono, bold, uppercase, tracking-[0.2em], `text-accent`.
- **Headline** (`welcomeHeadline`): `Measure any purchase in hours of your life.` — display font, 3xl→sm:4xl, uppercase.
- **Body** (`welcomeBody`): `Affordo turns your salary into a time budget, then weighs every goal against it. Set your income once, then add a goal any time you're tempted to spend.` — `max-w-prose`, muted.

**Step 1 — "Income"** (counter `02 / 04`; forward `Continue →`) — the only step with a gating validation. `canContinue` requires `salary > 0 && hoursPerWeek > 0 && hoursPerDay > 0 && paymentsPerYear > 0`.
Fields, in order:
- **Currency** (`currency` = `Currency`): shadcn `Select`. Options: `EUR — €`, `GBP — £`, `USD — $`.
- **Net monthly salary** (`netMonthlySalary`): number input, `inputMode="decimal"`, `placeholder="0"`, `autoFocus`.
- Two-column grid (`sm:grid-cols-2`):
  - **Hours per week** (`hoursPerWeek`): number input.
  - **Hours per day** (`hoursPerDay`): number input.
- **Payments per year** (`paymentsPerYear`): number input, hint `paymentsHint` = `Use 14 for Spanish-style extra payments.`

**Step 2 — "Expenses"** (counter `03 / 04`; forward `Continue →`)
- **Monthly fixed expenses** (`monthlyExpenses`): number input, `inputMode="decimal"`, `placeholder="0"`, `autoFocus`, hint `expensesHint` = `Rent, groceries, subscriptions, transport, utilities.`

**Step 3 — "Rules"** (counter `04 / 04`; forward `Finish setup →`)
- **Significance threshold** (`threshold`): label reads `Significance threshold — {draft.threshold}%`, a `Slider` `min=1 max=50 step=1`, hint `thresholdHint` = `Purchases above this % of your monthly income are flagged.`
- Two-column grid:
  - **Current savings** (`currentSavings`): number input, `placeholder="0"`.
  - **Extra monthly savings (optional)** (`monthlyContribution`): number input, `placeholder="0"`, hint `contributionHint` = `Money you consistently set aside on top of expenses.`

On the last step the primary button calls `setProfile(draft)` then navigates to `/goals`.

---

## 3. DESIGN TOKENS — literal values

There is **no `tailwind.config.ts`** (Tailwind v4). Tokens are declared in
`src/styles.css` via `@theme inline`, `:root`, and `.dark`. There is **no `index.html`**;
fonts are loaded via `head().links` in `src/routes/__root.tsx`.

### `@theme inline` (radius scale, color aliases, font stacks) — `styles.css:7-35`

| token | value |
| --- | --- |
| `--radius-sm` | `calc(var(--radius) - 4px)` |
| `--radius-md` | `calc(var(--radius) - 2px)` |
| `--radius-lg` | `var(--radius)` |
| `--radius-xl` | `calc(var(--radius) + 4px)` |
| `--color-background` | `var(--background)` |
| `--color-foreground` | `var(--foreground)` |
| `--color-card` / `--color-card-foreground` | `var(--card)` / `var(--card-foreground)` |
| `--color-popover` / `--color-popover-foreground` | `var(--popover)` / `var(--popover-foreground)` |
| `--color-primary` / `--color-primary-foreground` | `var(--primary)` / `var(--primary-foreground)` |
| `--color-secondary` / `--color-secondary-foreground` | `var(--secondary)` / `var(--secondary-foreground)` |
| `--color-muted` / `--color-muted-foreground` | `var(--muted)` / `var(--muted-foreground)` |
| `--color-accent` / `--color-accent-foreground` | `var(--accent)` / `var(--accent-foreground)` |
| `--color-destructive` / `--color-destructive-foreground` | `var(--destructive)` / `var(--destructive-foreground)` |
| `--color-border` | `var(--border)` |
| `--color-input` | `var(--input)` |
| `--color-ring` | `var(--ring)` |
| `--color-ring-offset-background` | `var(--background)` |
| `--font-sans` | `"Inter", system-ui, sans-serif` |
| `--font-display` | `"Anton", "Impact", sans-serif` |
| `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` |

### Color custom properties — `:root` (light) and `.dark`

| token | light (`:root`) | dark (`.dark`) | where used |
| --- | --- | --- | --- |
| `--radius` | `0.5rem` | (inherits) | radius scale base |
| `--background` | `oklch(0.985 0.002 60)` | `oklch(0.13 0 0)` | page bg, button text-on-dark |
| `--foreground` | `oklch(0.13 0 0)` | `oklch(0.985 0.002 60)` | body text, primary surfaces, big type |
| `--card` | `oklch(1 0 0)` | `oklch(0.17 0 0)` | goal card bg |
| `--card-foreground` | `oklch(0.13 0 0)` | `oklch(0.985 0.002 60)` | card text |
| `--popover` | `oklch(1 0 0)` | `oklch(0.17 0 0)` | select/dialog popover |
| `--popover-foreground` | `oklch(0.13 0 0)` | `oklch(0.985 0.002 60)` | popover text |
| `--primary` | `oklch(0.13 0 0)` | `oklch(0.985 0.002 60)` | shadcn Button default |
| `--primary-foreground` | `oklch(0.985 0.002 60)` | `oklch(0.13 0 0)` | Button default text |
| `--secondary` | `oklch(0.95 0.005 60)` | `oklch(0.22 0 0)` | secondary button |
| `--secondary-foreground` | `oklch(0.13 0 0)` | `oklch(0.985 0.002 60)` | — |
| `--muted` | `oklch(0.94 0.004 60)` | `oklch(0.22 0 0)` | muted surfaces |
| `--muted-foreground` | `oklch(0.45 0 0)` | `oklch(0.7 0 0)` | eyebrows, labels, captions |
| `--accent` | `oklch(0.68 0.19 45)` | `oklch(0.72 0.19 45)` | **orange** — hovers, kicker, threshold marker, ring |
| `--accent-foreground` | `oklch(0.985 0.002 60)` | `oklch(0.13 0 0)` | text on accent |
| `--destructive` | `oklch(0.58 0.22 27)` | `oklch(0.7 0.19 22)` | remove/reset, "cannot" badge |
| `--destructive-foreground` | `oklch(0.985 0.002 60)` | `oklch(0.13 0 0)` | text on destructive |
| `--border` | `oklch(0.13 0 0 / 15%)` | `oklch(1 0 0 / 12%)` | hairlines, input underlines |
| `--input` | `oklch(0.13 0 0 / 15%)` | `oklch(1 0 0 / 15%)` | shadcn input borders |
| `--ring` | `oklch(0.68 0.19 45)` | `oklch(0.72 0.19 45)` | focus ring (= accent) |

### Keyframes — `styles.css:82-100`

```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes scale-in-x {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
```

### Custom utilities — `styles.css:102-109`

```css
@utility animate-slide-up {
  animation: slide-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@utility animate-scale-in-x {
  animation: scale-in-x 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  transform-origin: left;
}
```

### `@layer base` — `styles.css:111-127`

```css
* { border-color: var(--color-border); }             /* default border color for all elements */
body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
  font-feature-settings: "ss01", "cv11";              /* Inter stylistic sets */
}
::selection {
  background-color: var(--color-accent);
  color: var(--color-accent-foreground);              /* orange selection highlight */
}
```

### Top of `styles.css` (Tailwind v4 wiring) — `styles.css:1-5`

```css
@import "tailwindcss" source(none);
@source "../src";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));
```
(`tw-animate-css` provides `animate-in`/`fade-*`/`zoom-*`/`slide-in-from-*` used by shadcn
dialog & select.)

### Fonts loaded in `__root.tsx` head links

```
preconnect https://fonts.googleapis.com
preconnect https://fonts.gstatic.com  (crossOrigin="anonymous")
stylesheet https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap
```
Weights actually loaded: Anton (single weight 400), Inter 400/500/600/700,
JetBrains Mono 400/500/700.

---

## 4. TYPOGRAPHY IN PRACTICE

Tailwind defaults referenced: `text-xs`=12px/16px, `text-sm`=14px/20px, `text-base`=16px/24px,
`text-xl`=20px/28px, `text-2xl`=24px/32px, `text-3xl`=30px/36px, `text-4xl`=36px/40px,
`text-5xl`=48px/1, `text-6xl`=60px/1, `text-8xl`=96px/1. Tracking: `tracking-tight`=-0.025em,
`tracking-wider`=0.05em, `tracking-widest`=0.1em, `tracking-[0.2em]`=0.2em. Weights:
`font-medium`=500, `font-bold`=700. Leading: `leading-none`=1, `leading-tight`=1.25,
`leading-relaxed`=1.625.

| role | classes (verbatim) | resolves to |
| --- | --- | --- |
| **Wordmark / brand** | `font-mono text-[11px] font-bold uppercase tracking-widest` | JetBrains Mono, 11px, 700, +0.1em, uppercase |
| **Eyebrow (page kicker)** | `font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground` | Mono 10px, 500, +0.2em, muted |
| **Onboarding kicker (accent)** | `font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent` | Mono 10px, 700, +0.2em, orange |
| **h1 (goals title)** | `font-display text-6xl uppercase leading-none tracking-tight sm:text-8xl` | Anton, 60px→96px, lh 1, -0.025em, uppercase |
| **h1 (settings title)** | `font-display text-6xl uppercase leading-none tracking-tight` | Anton, 60px, lh 1, -0.025em |
| **h1 (onboarding step)** | `font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl` | Anton, 48px→60px, lh 1 |
| **Onboarding headline** | `font-display text-3xl uppercase leading-tight tracking-tight sm:text-4xl` | Anton, 30px→36px, lh 1.25 |
| **Goal name (h2)** | `mt-1 truncate font-display text-3xl uppercase tracking-tight sm:text-4xl` | Anton, 30px→36px, -0.025em, truncated |
| **Result figure (price)** | `font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl` | Anton, 48px→60px, lh 1 |
| **Snapshot stat figure** | `mt-1 text-xl font-bold tracking-tight` | Inter, 20px, 700, -0.025em |
| **Lead / body (welcome body)** | `max-w-prose text-base leading-relaxed text-muted-foreground` | Inter, 16px, lh 1.625, muted |
| **Body (goal note)** | `mt-1 text-sm text-muted-foreground` | Inter, 14px, muted |
| **Label (form)** | `font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground` | Mono 10px, 700, +0.1em, muted |
| **Big input text** | (onboarding) `text-3xl font-bold` / (settings) `text-2xl font-bold` | Inter, 30px / 24px, 700 |
| **Button label (primary)** | `font-mono text-[11px] font-bold uppercase tracking-widest` | Mono 11px, 700, +0.1em |
| **Button label (ghost/small)** | `font-mono text-[10px] font-bold uppercase tracking-widest` | Mono 10px, 700, +0.1em |
| **Verdict badge** | `font-mono text-[10px] font-bold uppercase tracking-widest` | Mono 10px, 700, +0.1em |
| **Caption / meta (dates, %s)** | `font-mono text-[10px] uppercase tracking-wider text-muted-foreground` | Mono 10px, 400, +0.05em, muted |
| **Work-hours caption** | `font-mono text-xs uppercase tracking-wider text-muted-foreground` | Mono 12px, +0.05em, muted |
| **`/ hour` unit suffix** | `font-mono text-xs font-normal text-muted-foreground` | Mono 12px, 400, muted |
| **404 numeral** | `font-display text-8xl uppercase tracking-tight` | Anton, 96px |
| **loading… line** | `font-mono text-[11px] uppercase tracking-widest text-muted-foreground` | Mono 11px, +0.1em, muted |

---

## 5. COMPONENT INVENTORY

### `src/components/affordo/` (route-specific)

#### `AppHeader.tsx`
- **Props:** `{ showTimeValue?: boolean }` (default `true`).
- Computes `hourly` via `evaluate(profile, {id:"_",name:"_",price:0,note:"",createdAt:0}).hourlyRate` when `hasProfile`, else `0`.
- Root `<nav>`: `"sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md"`.
- Inner container: `"mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6"`.
- Brand `<Link to="/goals">`: `"font-mono text-[11px] font-bold uppercase tracking-widest"` → renders `t("brand")` = `Affordo`.
- Right group `<div>`: `"flex min-w-0 items-center gap-4"`.
  - Time-value `<span>` (only if `showTimeValue && hasProfile && hourly > 0`): `"hidden truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline"`; content: `t("hourlyRate")` (=`Time value`) + `: ` + inner `<span className="text-foreground">{formatMoney(hourly)} {t("perHour")}</span>`.
  - Settings `<Link to="/settings">` (only if `hasProfile`): `"font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"` → `t("settings")` = `Settings`.

#### `OnboardingWizard.tsx`
- **Props:** none. Internal `Field` subcomponent: `{ label, hint?, children, id }`.
- `Field` root: `"space-y-2"`; `<Label htmlFor={id}>` class `"font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground"`; hint `<p>` class `"text-[11px] leading-relaxed text-muted-foreground"`.
- `bigInputClass` = `"w-full border-0 border-b-2 border-border bg-transparent px-0 py-2 text-3xl font-bold outline-none transition-colors focus-visible:border-accent focus-visible:ring-0 rounded-none shadow-none"`.
- Root `<div className="min-h-dvh bg-background">`; main `"mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16"`.
- Header row: `"mb-8 flex items-end justify-between gap-4"`; eyebrow `"font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground"`; h1 `"mt-2 font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl"`; counter `<span className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">`.
- Progress bar row: `"mb-10 flex gap-1.5"`; each segment `` `h-1 flex-1 ${i <= step ? "bg-foreground" : "bg-border"}` `` + `aria-hidden`.
- Body wrapper: `<div key={step} className="animate-slide-up space-y-8">`.
- Footer: `"mt-12 flex items-center justify-between border-t border-border pt-6"`; Back Button `variant="ghost"` class `"font-mono text-[11px] font-bold uppercase tracking-widest"`; primary Button class `"rounded-none bg-foreground px-6 py-6 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground"`.

#### `GoalCard.tsx`
- **Props:** `{ goal: Goal; onEdit: () => void; onRemove: () => void }`.
- Memoizes `v = evaluate(profile, goal)`. `showDays = v.daysOfWork >= 1`; `workLabel` = days-of-work or hours-of-work string. `pctForBar = Math.min(100, (v.pctOfMonthlyIncome / (profile.threshold * 2)) * 100)`.
- Root `<article>`: `"border border-border bg-card p-6 sm:p-8"`.
- Header grid: `"grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4"`.
  - Left `<div className="min-w-0">`: date `<p>` `"font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground"` (`new Date(goal.createdAt).toLocaleDateString("en-US")`); name `<h2>` `"mt-1 truncate font-display text-3xl uppercase tracking-tight sm:text-4xl"`; optional note `<p>` `"mt-1 text-sm text-muted-foreground"`.
  - `<VerdictBadge kind={v.kind} />`.
- Price row: `"mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2"`; price `<span className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl">`; work caption `<span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">`.
- Threshold meter block (`"mt-6"`):
  - Caption row `"mb-2 flex justify-between font-mono text-[10px] uppercase tracking-wider"`: left `<span className="text-muted-foreground">{num(pct,1)}% {t("pctOfIncome")}</span>`; right `<span className={v.aboveThreshold ? "text-accent" : "text-muted-foreground"}>{t("threshold")}: {profile.threshold}%</span>`.
  - Track `<div className="relative h-2 w-full bg-black/5 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">`; fill `<div className="animate-scale-in-x h-full bg-foreground" style={{width: `${pctForBar}%`}} />`; marker `<div className="absolute top-0 h-full w-px bg-accent" style={{left: `${Math.min(100,50)}%`}} aria-hidden />` (marker is hard-coded to the 50% midpoint).
- Stats grid: `"mt-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2"`; each cell `"bg-background p-4"` with label `"font-mono text-[10px] uppercase tracking-wider text-muted-foreground"` and value `"mt-1 text-xl font-bold tracking-tight"`.
  - Cell 1 `Time to save`: value is `—` if `afford`, else `{months} months`, else `{cutMonths} months *`, else `∞`.
  - Cell 2 `Monthly surplus` (`t("disposable")`): `fmt(v.monthlyDisposable)`.
- Verdict explainer paragraph (one of, by kind):
  - `cutToAfford`: `"mt-4 border-l-2 border-accent bg-accent/5 p-3 text-sm"` — `Cut expenses by <b>{cutPct}%</b> to reach it in <b>{cutMonths} months</b>.`
  - `cannot`: `"mt-4 border-l-2 border-destructive bg-destructive/5 p-3 text-sm"` — `Beyond a reasonable savings plan.`
  - `afford`: `"mt-4 border-l-2 border-emerald-600 bg-emerald-600/5 p-3 text-sm"` — `You already have savings for this.`
- Actions row: `"mt-6 flex justify-end gap-2"`; Edit Button (ghost, sm) `"font-mono text-[10px] font-bold uppercase tracking-widest"`; Remove Button (ghost, sm) `"font-mono text-[10px] font-bold uppercase tracking-widest text-destructive hover:text-destructive"`.

#### `GoalDialog.tsx`
- **Props:** `{ open: boolean; onOpenChange: (open:boolean)=>void; initial?: Goal|null; onSave: (goal:Goal)=>void }`.
- Local state `name`, `price`, `note` (strings). On `open`, resets from `initial`.
- `valid = name.trim().length > 0 && parseFloat(price) > 0`.
- `submit()` builds goal: `id: initial?.id ?? crypto.randomUUID()`, `name: name.trim().slice(0,80)`, `price: parseFloat(price)`, `note: note.trim().slice(0,200)`, `createdAt: initial?.createdAt ?? Date.now()`.
- `DialogContent` class: `"rounded-none border-2 border-foreground sm:max-w-md"`.
- `DialogTitle`: `"font-display text-3xl uppercase tracking-tight"` — `initial ? t("editGoal") : t("addGoal")`.
- `DialogDescription`: `"font-mono text-[10px] uppercase tracking-widest"` — `t("brand")` = `Affordo`.
- `<form className="space-y-5">` submits on Enter. Three fields (each `"space-y-2"` with a mono label):
  - Name: `<Input id="g-name" maxLength={80} autoFocus placeholder="MacBook Pro">`.
  - Price: `<Input id="g-price" type="number" inputMode="decimal" placeholder="0">`.
  - Note: `<Textarea id="g-note" maxLength={200} rows={2}>`.
- `DialogFooter className="gap-2"`: Cancel Button (ghost) `"font-mono text-[10px] font-bold uppercase tracking-widest"`; Save Button (type submit, `disabled={!valid}`) `"rounded-none bg-foreground font-mono text-[10px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground"`.

#### `VerdictBadge.tsx`
- **Props:** `{ kind: VerdictKind }`.
- `styles` map: `afford: "bg-emerald-600 text-white"`, `stretch: "bg-foreground text-background"`, `cutToAfford: "bg-accent text-accent-foreground"`, `cannot: "bg-destructive text-destructive-foreground"`.
- Label map: `afford→t("verdictAfford")`, `stretch→t("verdictStretch")`, `cutToAfford→t("verdictCut")`, `cannot→t("verdictCannot")`.
- Root `<span>`: `cn("inline-flex items-center px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest", styles[kind])`.

### `src/components/ui/` shadcn primitives depended on by the routes

Directly imported by in-scope screens: **button, input, label, slider, select, dialog,
textarea, sonner**. (The full `ui/` folder contains ~45 shadcn components, but the rest are
unused Lovable scaffolding.)

| primitive | Radix / lib package | notes |
| --- | --- | --- |
| `button.tsx` | `@radix-ui/react-slot`, `class-variance-authority` | variants: default/destructive/outline/secondary/ghost/link; sizes: default/sm/lg/icon. Base has `rounded-md` — routes override with `rounded-none`. |
| `input.tsx` | (native `<input>`) | base: `h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base … md:text-sm`. |
| `label.tsx` | `@radix-ui/react-label`, `cva` | base: `text-sm font-medium leading-none …`. |
| `slider.tsx` | `@radix-ui/react-slider` | Track `h-1.5 rounded-full bg-primary/20`, Range `bg-primary`, Thumb `h-4 w-4 rounded-full border border-primary/50 bg-background`. |
| `select.tsx` | `@radix-ui/react-select`, `lucide-react` (Check, ChevronDown, ChevronUp) | Trigger `h-9 rounded-md border border-input`; Content uses `tw-animate-css` data-state animations. |
| `dialog.tsx` | `@radix-ui/react-dialog`, `lucide-react` (X) | Overlay `bg-black/80`; Content centered `max-w-lg … sm:rounded-lg` (routes override `rounded-none`); built-in Close button with `sr-only` "Close". |
| `textarea.tsx` | (native `<textarea>`) | base: `min-h-[60px] rounded-md border border-input`. |
| `sonner.tsx` | `sonner` | wraps `<Toaster>`; toast classNames map bg/text/border to tokens. |

Root also uses `@tanstack/react-query` (`QueryClientProvider`) and
`@tanstack/react-router` (`Outlet`, `Link`, `Navigate`, `HeadContent`, `Scripts`).
Icons from `lucide-react` used in routes: `Plus` (goals add button).

---

## 6. COPY — verbatim, every user-visible string

Source of truth: `src/lib/i18n.ts` (single English dict; there is **no** Spanish dict in
code despite the plan). Reproduced exactly, including punctuation and the ` (optional)`
suffixes.

### Brand / global
- `brand`: `Affordo`
- `tagline`: `Weigh purchases against your working hours.` *(defined, not rendered)*

### Onboarding chrome
- `onboardingTitle`: `Set up your reckoning`
- `step`: `Step` *(defined, not rendered)*
- `of`: `of` *(defined, not rendered)*
- `back`: `Back`
- `continue`: `Continue`
- `start`: `Start`
- `finish`: `Finish setup`
- `stepWelcomeLabel`: `Welcome`
- `stepIncomeLabel`: `Income`
- `stepExpensesLabel`: `Expenses`
- `stepRulesLabel`: `Rules`

### Onboarding step 0 (Welcome)
- `welcomeKicker`: `Before you buy`
- `welcomeHeadline`: `Measure any purchase in hours of your life.`
- `welcomeBody`: `Affordo turns your salary into a time budget, then weighs every goal against it. Set your income once, then add a goal any time you're tempted to spend.`

### Field labels & hints (onboarding + settings)
- `currency`: `Currency`
- `netMonthlySalary`: `Net monthly salary`
- `hoursPerWeek`: `Hours per week`
- `hoursPerDay`: `Hours per day`
- `paymentsPerYear`: `Payments per year`
- `paymentsHint`: `Use 14 for Spanish-style extra payments.`
- `monthlyExpenses`: `Monthly fixed expenses`
- `expensesHint`: `Rent, groceries, subscriptions, transport, utilities.`
- `threshold`: `Significance threshold`
- `thresholdHint`: `Purchases above this % of your monthly income are flagged.`
- `currentSavings`: `Current savings`
- `monthlyContribution`: `Extra monthly savings (optional)`
- `contributionHint`: `Money you consistently set aside on top of expenses.`

### Dashboard / goals
- `goalsTitle`: `Goals`
- `addGoal`: `Add goal`
- `editGoal`: `Edit goal`
- `goalName`: `Name`
- `goalPrice`: `Price`
- `goalNote`: `Note (optional)`
- `save`: `Save`
- `cancel`: `Cancel`
- `remove`: `Remove`
- `edit`: `Edit`
- `empty`: `No decisions to reckon with yet.`
- `emptyHint`: `Add your first goal to see what it costs in hours of your life.`

### Verdict + goal-card body
- `verdictAfford`: `Afford`
- `verdictStretch`: `Stretch`
- `verdictCut`: `Cut to afford`
- `verdictCannot`: `Cannot`
- `daysOfWork`: `days of work`
- `hoursOfWork`: `hours of work`
- `pctOfIncome`: `of monthly income`
- `timeToSave`: `Time to save`
- `months`: `months`
- `cutExpenses`: `Cut expenses by`
- `toReachIn`: `to reach it in`
- `aboveBudget`: `Beyond a reasonable savings plan.`
- `payItOff`: `You already have savings for this.`

### Snapshot
- `hourlyRate`: `Time value`
- `perHour`: `/ hour`
- `disposable`: `Monthly surplus`

### Settings
- `settings`: `Settings`
- `profile`: `Profile` *(defined, not rendered)*
- `resetAll`: `Reset everything`
- `resetConfirm`: `This will erase your profile and all goals. Continue?`
- `savedGoals`: `Saved goals`

### Footer
- `footerLocal`: `Record persistent in local-cache`

**Teardown** (`src/routes/goals.tsx:146-149`) — added later than the rest of this
document, which originally recorded this footer's copy and landmark but no class
string.

**This document tears down components, not route bodies.** §5 and §16 cover
`AppHeader`, `OnboardingWizard`, `GoalCard`, `GoalDialog`, `VerdictBadge` and each
wizard step exhaustively; nothing covers the bodies of `GoalsPage` or
`SettingsPage`. So markup living directly in a route is unrecorded by default —
this footer, the snapshot section, the divider hairlines, the add-goal button and
the route `<main>` elements among them. Do not read silence here as evidence about
the reference (#127).

That gap caused a real regression: PR #102's duel reasoned from the silence that
this footer's dimming must be invented, and it was removed. It is not invented
(#104).

```tsx
<footer className="mt-16 flex justify-between border-t border-border pt-6 opacity-50">
  <p className="font-mono text-[10px] uppercase tracking-wider">{t("footerLocal")}</p>
  <p className="font-mono text-[10px] uppercase tracking-wider">Affordo</p>
</footer>
```

Notes:
- **Inside `<main>`** (`mx-auto max-w-3xl px-4 py-10 sm:px-6`), not after it — so
  `mt-16 border-t border-border pt-6` separates the footer from the content above
  rather than from the viewport edge.
- **`opacity-50` on the footer**, not `text-muted-foreground` on the text. The
  children carry no colour of their own, only `font-mono text-[10px] uppercase
  tracking-wider` — §4's "Caption / meta" type without its muted colour.
- The right-hand label is the literal `Affordo`, **not** a dict key, unlike the
  left-hand note.

### Strings NOT in the dict (hard-coded in components)

- Select option labels (onboarding + settings): `EUR — €`, `GBP — £`, `USD — $` (em-dash + currency symbol).
- `/goals` snapshot eyebrow uses `t("brand")` = `Affordo`.
- `/goals` "Saved goals" divider renders `t("savedGoals") + " · " + goals.length` → `Saved goals · 0`.
- `/goals` footer right label: literal `Affordo` (not via dict), left label via `t("footerLocal")`.
- Goal card composite sentence (cutToAfford): `Cut expenses by` **{cutPct}%** `to reach it in` **{cutMonths} months**`.`
- Time-to-save `*` suffix appears when the value comes from `cutMonths` (`{cutMonths} months *`). No footnote explains the `*`.
- Fallback glyphs: `—` (em-dash, for afford / non-finite money), `∞` (infinity, no path to save).
- 404 page: `404` / `Page not found` / `Go home`.
- Error boundary: `Something broke` / `The audit could not load.` / `Try again` / `Go home`.
- Loading lines: `loading…` (goals/index) and `loading…` (with ellipsis char U+2026).
- Placeholders: salary/expenses/savings/contribution inputs `0`; goal name `MacBook Pro`; goal price `0`.
- Dialog close button screen-reader label: `Close` (`sr-only`).
- Toast on settings save: `t("save")` = `Save` (uses `toast.success`).

---

## 6b. ROUTE-BODY TEARDOWN

Added by #127. **§5 and §16 tear down components; this section tears down the
markup that lives directly in a route.** Before this existed, route bodies were
unrecorded by default, and #104 is what that cost: a duel reasoned from the
silence that the `/goals` footer's dimming was invented, removed it, and shipped
a regression that survived review because the premise looked authoritative.

Extracted from `agvergara/dream-purchase-planner` at `src/routes/*.tsx`.

### `/` — `index.tsx`

No head. Renders a hydration gate only:

```tsx
<div className="flex min-h-dvh items-center justify-center bg-background">
  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
    loading…
  </p>
</div>
```

Then `<Navigate to={hasProfile ? "/goals" : "/onboarding"} />`.

**Divergences:**

| element | reference | ours |
| --- | --- | --- |
| container | `<div className="flex min-h-dvh items-center justify-center bg-background">` | `<main className="grid min-h-screen place-items-center">` — no `bg-background` |
| loading line | `text-muted-foreground` | was `text-muted`, a *surface* token at ~1.15:1 — invisible in both themes. Fixed in #132 |

### `/onboarding` — `onboarding.tsx`

A head (§1) plus `component: OnboardingWizard`. **No body of its own** — all markup
is the component, torn down in §16.

### `/goals` — `goals.tsx`

Shell: `<div className="min-h-dvh bg-background">`, `<AppHeader />`, then
`<main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">`.

```tsx
{/* Snapshot */}
<section className="mb-10 border-t-4 border-foreground pt-6">
  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{t("brand")}</p>
  <h1 className="mt-2 font-display text-6xl uppercase leading-none tracking-tight sm:text-8xl">{t("goalsTitle")}</h1>
  <div className="mt-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
    {/* The three tiles share their chrome and DIFFER in their value. Do not
        collapse them: only the first carries the per-hour suffix, the second is
        a bare amount, and the third is a percentage rather than money. */}
    <div className="bg-background p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t("hourlyRate")}</p>
      <p className="mt-1 text-xl font-bold tracking-tight">
        {fmt(hourly)} <span className="font-mono text-xs font-normal text-muted-foreground">{t("perHour")}</span>
      </p>
    </div>
    <div className="bg-background p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t("disposable")}</p>
      <p className="mt-1 text-xl font-bold tracking-tight">{fmt(disposable)}</p>
    </div>
    <div className="bg-background p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t("threshold")}</p>
      <p className="mt-1 text-xl font-bold tracking-tight">{profile.threshold}%</p>
    </div>
  </div>
</section>

{/* Divider */}
<div className="mb-6 flex items-center justify-between">
  <div className="flex items-center gap-4">
    <div className="h-px flex-1 bg-border" />
    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
      {t("savedGoals")} · {goals.length}
    </span>
    <div className="h-px flex-1 bg-border" />
  </div>
</div>

{/* Add button */}
<div className="mb-8 flex justify-end">
  <Button className="gap-2 rounded-none bg-foreground px-5 py-5 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground">
    <Plus className="size-4" />
    {t("addGoal")}
  </Button>
</div>

{/* Empty state */}
<div className="border-2 border-dashed border-border p-12 text-center">
  <p className="font-display text-3xl uppercase tracking-tight">{t("empty")}</p>
  <p className="mt-2 text-sm text-muted-foreground">{t("emptyHint")}</p>
</div>

{/* List */}
<div className="space-y-5">…</div>
```

Footer: see §6 above.

### `/settings` — `settings.tsx`

Shell as `/goals` but `<main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">`.
Same `mb-10 border-t-4 border-foreground pt-6` header wrapper, carrying the
`Affordo` eyebrow and `<h1>` with `font-display text-6xl` and **no
`sm:text-8xl`**.

**`/settings` defines its own input class, not §16's.** `settings.tsx:59-60`:

```
w-full border-0 border-b-2 border-border bg-transparent px-0 py-2 text-2xl
font-bold outline-none focus-visible:border-accent focus-visible:ring-0
rounded-none shadow-none
```

That is `text-2xl` and has **no `transition-colors`**, where §16's
`bigInputClass` is `text-3xl` **with** it. The two screens are not the same
control and §16 must not be used as this screen's record — an earlier draft of
this section said it could be, which is exactly the substitution that produces
drift.

Fields in `space-y-8`, each `space-y-2` with a `font-mono text-[10px] font-bold
uppercase tracking-widest text-muted-foreground` label. Currency uses
`bigInput + " h-auto"` on the `SelectTrigger`. The three hour/payment fields sit
in `grid gap-8 sm:grid-cols-3`, the savings pair in `grid gap-8 sm:grid-cols-2`.

**Field order:** currency, salary, the hours/payments trio, expenses, the savings
pair, **threshold last**.

Action row (`settings.tsx:148-162`), which is not a wizard control and has no
other record:

```tsx
<div className="mt-12 flex items-center justify-between border-t border-border pt-6">
  <Button variant="ghost" className="font-mono text-[10px] font-bold uppercase tracking-widest text-destructive hover:text-destructive">{t("resetAll")}</Button>
  <Button className="rounded-none bg-foreground px-6 py-6 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground">{t("save")}</Button>
</div>
```

### `__root.tsx` — the 404 and error screens

Route bodies like any other, and previously recorded only as copy (§6) and prose
(§2/§14).

```tsx
{/* NotFoundComponent */}
<div className="flex min-h-screen items-center justify-center bg-background px-4">
  <div className="max-w-md text-center">
    <h1 className="font-display text-8xl uppercase tracking-tight text-foreground">404</h1>
    <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">Page not found</p>
    <div className="mt-6">
      <Link to="/" className="inline-flex items-center border-2 border-foreground bg-foreground px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-transparent hover:text-foreground">Go home</Link>
    </div>
  </div>
</div>

{/* ErrorComponent */}
<div className="flex min-h-screen items-center justify-center bg-background px-4">
  <div className="max-w-md text-center">
    <h1 className="font-display text-4xl uppercase tracking-tight">Something broke</h1>
    <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">The audit could not load.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      <button className="border-2 border-foreground bg-foreground px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-transparent hover:text-foreground">Try again</button>
      <a href="/" className="border-2 border-foreground px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background">Go home</a>
    </div>
  </div>
</div>
```

Two things not to collapse here:

- **The error screen's `<h1>` is `text-4xl` where the 404's is `text-8xl`.** Not
  the same treatment.
- **The two error-screen controls are inverses, not variants of one button.**
  `Try again` is solid (`bg-foreground`, `text-background`) hovering to outline;
  `Go home` is outline (`text-foreground`, no `bg-`) hovering to solid. Each
  inverts into the other. The 404's `Link` is the solid variant again, plus
  `inline-flex items-center`.

**Not covered by the teardowns above:** each route's pre-render branches — the
`!hydrated` loading gate and the profile guard that precede the body (reference
`goals.tsx:30-36`, and the equivalents on `/settings` and `/onboarding`). §6b
records what a route paints once it has data. The markup for `/`'s gate *is*
recorded, which makes the omission easy to misread as completeness (#134's
duel). Read a route's guard from the reference, never from here.

### Known divergences at time of extraction

Recorded rather than fixed — reconciliation is tracked on #127. **This list is
what two passes found; it is not a proof of completeness.**

Every row below is derived from the reference file and our source at the moment
of writing. That qualifier is load-bearing: an earlier draft of this table
carried two rows re-keyed from review comments rather than re-read from source,
and both were wrong — one with its columns swapped against prose 60 lines above
it, and one asserting a divergence where the two files are byte-identical. **A
row copied from a correct observation has not been verified merely because the
observation was.**

**All but the last row are reconciled** — see the PR closing #127 for `/goals`.
They are kept here rather than deleted because the table's value is as a record
of what drifted and why, and because a future extraction pass needs to know
these rows were checked rather than never examined.

| element | reference | ours (before) | status |
| --- | --- | --- | --- |
| snapshot section wrapper | `mb-10 border-t-4 border-foreground pt-6` | **absent** | fixed |
| snapshot grid | `mt-6` | `mt-10` | fixed |
| divider hairlines | `h-px flex-1 bg-border` either side | **absent** | fixed |
| divider wrapper | `mb-6` | `mt-12 … gap-4` | fixed |
| add-goal button | `px-5 py-5`, `text-[11px]`, `gap-2`, `<Plus className="size-4" />`, in `mb-8 flex justify-end` | `px-4 py-2`, `text-[10px]`, no icon, no wrapper | fixed |
| empty state | `border-2 … p-12`, `font-display text-3xl` | `border … p-10`, `text-2xl` | fixed |
| goals list | `space-y-5` | `mt-6 space-y-4` | fixed |
| divider label | `font-medium`, `tracking-[0.2em]`, `<span>` | `font-bold`, `tracking-widest`, `<div>` | fixed |
| divider / add-button | two blocks: `mb-6` divider, then `mb-8 flex justify-end` | merged into one `justify-between` row | fixed |
| list element | `<div className="space-y-5">` | `<ul>` / `<li>` | **deferred** |

The last row is deliberately not reconciled. Reproducing it would delete the
list semantics a screen reader uses to announce "list, 3 items", which makes it
the accessibility-versus-fidelity call that #115/#116/#99 are waiting on the
product owner to settle. Every other row here is geometry, so none of them turn
on that question and all were fixed. The `Plus` glyph is inlined at lucide's
geometry rather than adding the dependency, following `AppHeader`'s precedent.

Note the reference's `<Plus>` sits inside a button whose text already says "Add
goal", so ours is `aria-hidden` — that is not a divergence from the reference's
rendering, which produces an SVG with no accessible name either way.

**Copying a reference `className` is not fidelity when the reference element is a
component with a base layer.** The add button needs `h-9` and `border-0` beyond
the reference's own string to render at the reference's height. `h-9` comes from
the shadcn `<Button>` size variant the route composes with — it survives
tailwind-merge against `px-5 py-5`, since height and padding are separate
conflict groups, so `py-5` never grows that button. `border-0` cancels a legacy
global `button` border this port carries and the reference has no equivalent of
(#135).

Measured in Chromium, because none of this is visible to jsdom: `h-9` alone
36px, `h-9 px-4 py-2` (the bare size variant) 36px, `h-9 px-5 py-5` (what the
route actually merges to) **40px** — border-box clamps height up to the padding.
40px is the reference's height and ours. Reading 36px off the size variant alone
is the easy mistake here; #134's duel made it.

**`/settings`:**

**All reconciled** except the last row, which is behaviour rather than geometry
and is filed as #136.

| element | reference | ours (before) | status |
| --- | --- | --- | --- |
| header wrapper | `mb-10 border-t-4 border-foreground pt-6`, **with the `Affordo` eyebrow** | absent — including the eyebrow, which is copy, not chrome | fixed |
| field order | threshold **last**, after the savings pair | follows the wizard's order | fixed |
| main padding | `py-10` | `py-16` | fixed |
| field label | `text-[10px]` **with** `font-bold` | `text-[11px]`, no `font-bold` | fixed |
| input | `border-0 border-b-2 … px-0 rounded-none shadow-none`, **plus `h-9` and `md:text-sm` from `<Input>`** | `border-b`, no `border-0`/`px-0`/`h-9` | fixed |
| save button | `rounded-none … px-6 py-6`, `font-bold` | `rounded-md … py-3`, no `font-bold` | fixed |
| reset button | ghost `<Button>`: `h-9 px-4 py-2`, `hover:bg-accent`, **`rounded-md`** | `p-0`, no hit area beyond its text | fixed |
| hints | none rendered on this screen | three hint paragraphs | fixed |
| Save disabled | no disabled state | `disabled={!canSave}` | fixed — see below |

Three rows here were **not** in the first extraction — the reset button's
geometry, the input's full `bigInput` string, and the Save disabled state. The
table above them still says this list is not a proof of completeness, and that
remains true after this pass.

Measured in Chromium, matching the reference's merged strings: Save **48px**
(`h-9 px-6 py-6` — `py-6` dominates), Reset **36px** at **6px radius** (`h-9
px-4 py-2` — `h-9` dominates, and `rounded-md` survives from the base because
neither the ghost variant nor the route carries a `rounded-*`), inputs **36px at
14px type from 768px up, 24px below**. The inputs need `border-0` for the reason
#135 records: this port's base layer puts a 1px border on every `input`, which
`border-b-2` alone leaves on the other three sides.

**The inputs are the second time this bit.** `bigInput` sets padding but no
height, and `text-2xl` displaces `<Input>`'s `text-base` but not its `md:`
variant — so `h-9` and `md:text-sm` both survive tailwind-merge, and the
reference's inputs are 14px type on desktop and 24px on mobile. Reproducing the
route's string alone gave 50px at 24px throughout. Once `h-9` is present the
select's `h-auto` becomes meaningful again: the reference passes it to cancel
`SelectTrigger`'s own `h-9`, deliberately letting the select sit taller than the
inputs beside it (37px vs 36px at desktop, 49px vs 36px at mobile).

**Save's disabled state is reproduced as absent (#136, closed).** Saving a
zero-salary draft ejects the user to `/onboarding` through the route guard —
that is the reference's behaviour, and #39's bar is "pixel-for-pixel *and
behaviour-for-behaviour* … if it looks like a mistake, it is a requirement". It
has no carve-out for behaviour that looks wrong, so this was not a policy
question to defer. §14's "settings save → stays (toast only)" describes saving a
valid draft, which is every draft the guard lets you reach the screen with.

That is worth separating from the `<ul>`/`<li>` deferral on `/goals`, which
stands: an accessibility regression is a distinct question from a behaviour that
merely looks like an oversight, and #115/#116/#99 are genuinely open on it.

**`__root.tsx` (404 / error):**

| element | reference | ours |
| --- | --- | --- |
| container (both screens) | `min-h-screen items-center justify-center … px-4` + inner `max-w-md text-center` | `min-h-dvh flex-col … gap-6 px-4 py-16 text-center`, no inner wrapper |
| error `<h1>` | `text-4xl` | `text-6xl sm:text-8xl` |
| 404 `<h1>` | `text-8xl … text-foreground` | `text-8xl`, no `text-foreground` |
| caption | `mt-4` (404) / `mt-2` (error), `text-xs` | `text-[11px]`, no `mt-*` |
| error `Try again` | **solid**: `border-2 border-foreground bg-foreground px-4 py-2 … text-background`, hovering to outline | **solid**: `border border-border bg-foreground px-6 py-3 … text-background`, hovering to accent |
| error `Go home` | **outline**: `border-2 border-foreground … text-foreground`, hovering to solid | **outline**: `border border-border px-6 py-3`, hovering to solid |
| 404 `Go home` | **solid**, as `Try again` above, plus `inline-flex items-center` | **outline** — byte-identical to our error `Go home` |

**Read that per control, not per screen.** The reference ships **two solid and one
outline**; we ship **one solid and two outline**, because our two `Go home` links
are byte-identical to each other while the reference's 404 `Go home` is a filled
CTA and its error `Go home` is not. A row grouping controls by their *reference*
treatment hides that, since the grouping does not hold on our side — which is how
an earlier draft of this table came to assert three classes our 404 button does
not have.

## 7. FORMS AND INPUTS

`num(v)` helper (onboarding + settings): `parseFloat(v.replace(",", "."))`, returns `0` if NaN.
This accepts a comma as decimal separator but not thousands separators.

### Onboarding / Settings profile fields

| field | label | input | units | min/max/step | default | validation |
| --- | --- | --- | --- | --- | --- | --- |
| currency | `Currency` | Select (EUR/GBP/USD) | — | — | `EUR` | enum |
| salary | `Net monthly salary` | number, `inputMode="decimal"`, placeholder `0` | currency | — | `0` | must be `> 0` to leave step 1 / have a profile |
| hoursPerWeek | `Hours per week` | number | hours | — | `40` | `> 0` to leave step 1 |
| hoursPerDay | `Hours per day` | number | hours | — | `8` | `> 0` to leave step 1 |
| paymentsPerYear | `Payments per year` | number | count | — | `12` | `> 0` to leave step 1 |
| expenses | `Monthly fixed expenses` | number, `inputMode="decimal"`, placeholder `0` | currency | — | `0` | none (nonnegative in schema) |
| threshold | `Significance threshold` | Slider | `%` | min `1`, max `50`, step `1` | `10` | — |
| savings | `Current savings` | number, placeholder `0` | currency | — | `0` | none |
| monthlyContribution | `Extra monthly savings (optional)` | number, placeholder `0` | currency | — | `0` | none |

Notes:
- Number inputs bind `value={draft.X || ""}` so a `0` shows as an empty field (placeholder `0` visible).
- Slider label interpolates live value: `Significance threshold — {threshold}%`.
- Zod `ProfileSchema` (validation on load, not on input): `salary` nonnegative; `hoursPerWeek/hoursPerDay/paymentsPerYear` **positive**; `threshold` 0–100; `expenses/savings/monthlyContribution` nonnegative.

### Goal dialog fields

| field | label | input | limits | placeholder | validation |
| --- | --- | --- | --- | --- | --- |
| name | `Name` | text Input, `autoFocus` | `maxLength=80`, trimmed+`slice(0,80)` | `MacBook Pro` | `name.trim().length > 0` |
| price | `Price` | number Input, `inputMode="decimal"` | `parseFloat`, must be `> 0` | `0` | `parseFloat(price) > 0` |
| note | `Note (optional)` | Textarea `rows={2}` | `maxLength=200`, trimmed+`slice(0,200)` | — | none |

Save button disabled until `valid`. No inline error messages are shown anywhere — validation
is expressed purely by disabling the primary action.

### Number formatting on display (`src/lib/format.ts`)

- Locale by currency: `EUR → de-DE`, `GBP → en-GB`, `USD → en-US` (default `en-US`).
- `formatMoney(value, currency)`: `Intl.NumberFormat(locale, {style:"currency", currency, maximumFractionDigits:2})`. Non-finite → `—`. try/catch fallback `` `${value.toFixed(2)} ${currency}` ``.
  - So EUR renders e.g. `1.234,56 €`; USD `$1,234.56`; GBP `£1,234.56`.
- `formatNumber(value, currency, digits=1)`: `Intl.NumberFormat(locale, {maximumFractionDigits:digits, minimumFractionDigits:0})`. Non-finite → `—`. Used for percentages, days/hours, months.
- Dates: `new Date(goal.createdAt).toLocaleDateString("en-US")` (always US format, independent of currency).

---

## 8. DATA AND PERSISTENCE

### State shape

`Profile` (Zod-validated):
```ts
{ currency: "EUR"|"USD"|"GBP", salary, hoursPerWeek, hoursPerDay,
  paymentsPerYear, expenses, threshold, savings, monthlyContribution }  // all numbers
```
`defaultProfile`: `{ currency:"EUR", salary:0, hoursPerWeek:40, hoursPerDay:8, paymentsPerYear:12, expenses:0, threshold:10, savings:0, monthlyContribution:0 }`.

`Goal`:
```ts
{ id: string, name: string(1..80), price: number>=0, note: string(<=200, default ""), createdAt: number }
```

### Persistence

- Hook `useLocalState<T>(key, initial, schema?)` in `src/hooks/use-local-state.ts`. SSR-safe:
  starts with `initial`, hydrates from `localStorage` inside `useEffect` post-mount, sets
  `hydrated=true`. Writes on every update via `localStorage.setItem(key, JSON.stringify(...))`.
  On load, validates with Zod `safeParse`; on failure keeps `initial` (silently).
- **localStorage keys actually used:**
  - `affordo.profile` → the `Profile` object.
  - `affordo.goals` → array of `Goal`.
  - (The plan mentions `affordo.lang`, but **language is not persisted in the shipped code** — no lang state exists; only English is present.)
- Context (`AffordoProvider`) exposes: `hydrated`, `profile`, `hasProfile` (`hydrated && salary>0`), `setProfile`, `clearProfile`, `goals`, `setGoals`, `clearGoals`, `t`.

### Calculation logic — `src/lib/affordability.ts` `evaluate(profile, goal) → Verdict`

Inputs destructured from profile + `goal.price`.

Formulas:
- `yearlyIncome = salary * paymentsPerYear`
- `hourlyRate = hoursPerWeek > 0 ? yearlyIncome / (52 * hoursPerWeek) : 0`
- `hoursOfWork = hourlyRate > 0 ? price / hourlyRate : Infinity`
- `daysOfWork = hoursPerDay > 0 ? hoursOfWork / hoursPerDay : Infinity`
- `pctOfMonthlyIncome = salary > 0 ? (price / salary) * 100 : Infinity`
- `aboveThreshold = pctOfMonthlyIncome > threshold`
- `monthlyDisposable = salary - expenses + monthlyContribution`
- `remaining = Math.max(0, price - savings)`

Verdict decision tree:
1. `savings >= price` → **`afford`**.
2. else if `monthlyDisposable > 0`:
   - `monthsToSave = remaining / monthlyDisposable`.
   - if `monthsToSave <= 12` → **`stretch`**.
   - else: `targetMonthly = remaining / 12`; `extraNeeded = targetMonthly - monthlyDisposable`; `maxCut = expenses * 0.5`. If `extraNeeded <= maxCut` → **`cutToAfford`** (`cutPct = expenses>0 ? extraNeeded/expenses*100 : 0`, `cutMonths = 12`). Else → **`cannot`**.
3. else (no surplus): `targetMonthly = remaining / 12`; `maxCut = expenses * 0.5`. If `targetMonthly - monthlyDisposable <= maxCut` → **`cutToAfford`** (`cutPct` similar, `cutMonths=12`). Else → **`cannot`**.

Outputs (`Verdict`): `{ kind, hourlyRate, hoursOfWork, daysOfWork, pctOfMonthlyIncome, aboveThreshold, monthlyDisposable, monthsToSave|null, cutPct|null, cutMonths|null }`.

Rounding: **none in the math** — all rounding is presentational via `formatNumber`
(1 digit default) and `formatMoney` (max 2 digits). `daysOfWork >= 1` chooses days vs hours
in the card. `pctForBar = min(100, pct/(threshold*2)*100)` — so the bar is full at `2×threshold`.

---

## 9. INTERACTION AND MOTION

- **Step transition:** `<div key={step} className="animate-slide-up …">` — re-mount per step
  re-runs `slide-up` (0.5s, `cubic-bezier(0.2,0.8,0.2,1)`, `opacity 0→1`, `translateY 16px→0`).
- **Threshold bar fill:** `animate-scale-in-x` (0.7s, same easing, `scaleX 0→1`, origin left).
- **Buttons:** base `transition-colors`; primary CTAs invert to accent on hover
  (`hover:bg-accent hover:text-accent-foreground`), losing their black background.
- **Ghost buttons:** shadcn ghost = `hover:bg-accent hover:text-accent-foreground`; destructive
  ghost pins text with `text-destructive hover:text-destructive`.
- **Header links:** `text-muted-foreground hover:text-foreground`.
- **Inputs (big audit style):** `transition-colors`, `focus-visible:border-accent`,
  `focus-visible:ring-0` — focus indicated by the bottom border turning orange, no ring.
- **shadcn inputs/select/dialog:** default `focus-visible:ring-1 focus-visible:ring-ring`
  (ring = accent). Select trigger `data-[placeholder]:text-muted-foreground`.
- **Disabled:** shadcn buttons `disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed`; primary CTAs disabled when validation fails; Back disabled on step 0.
- **Dialog:** overlay `bg-black/80` + `fade-in/out`; content `zoom-in-95/zoom-out-95` + `fade` via `tw-animate-css`, `duration-200`. Close (X) top-right `opacity-70 hover:opacity-100`.
- **Select content:** slide-in-from-* by side, zoom + fade on open/close.
- **Toast:** `sonner` `<Toaster position="top-center" />`; success toast on settings save; styled to tokens (`bg-background text-foreground border-border shadow-lg`).
- **No skeleton loaders** — loading is a single mono `loading…` line; index/goals gate on `hydrated`.

---

## 10. RESPONSIVE AND THEME

Breakpoints used: only Tailwind `sm:` (≥640px). No `md:`/`lg:`/`xl:` in the route/component
code (shadcn primitives use `md:text-sm` internally). `min-h-dvh` for full-height pages.

What changes at `sm:`:
- Container padding: `px-4 → sm:px-6`; onboarding vertical `py-10 → sm:py-16`.
- Goals title: `text-6xl → sm:text-8xl`. Onboarding h1: `text-5xl → sm:text-6xl`. Onboarding headline: `text-3xl → sm:text-4xl`. Goal name/price: `text-3xl/5xl → sm:text-4xl/6xl`.
- Grids: snapshot `grid-cols-1 → sm:grid-cols-3`; goal stats `grid-cols-1 → sm:grid-cols-2`; income & rules field grids `sm:grid-cols-2`; settings hours grid `sm:grid-cols-3`.
- Goal card padding `p-6 → sm:p-8`.
- AppHeader time-value chip: `hidden … sm:inline` (hidden on mobile).
- Dialog: `sm:max-w-md` (GoalDialog) / base `max-w-lg` (shadcn); footer `flex-col-reverse → sm:flex-row sm:justify-end`.
- Max widths: header/goals `max-w-3xl`; onboarding/settings `max-w-2xl`; settings main `max-w-2xl`.

**Dark mode:** Tokens for `.dark` are fully defined and `@custom-variant dark (&:is(.dark *))`
is declared, plus dark-specific classes exist (`dark:bg-white/5 dark:ring-white/10` on the
goal bar). **But there is no theme toggle and nothing ever adds the `.dark` class** — the app
ships light-only. Dark mode is latent/unreachable via UI.

---

## 11. ACCESSIBILITY

- **Semantic structure:** `<nav>` header, `<main>` per page, `<section>`, `<article>` per goal
  card, `<h1>`/`<h2>` headings, `<footer>`. `RootShell` sets `<html lang="en">`.
- **Heading order:** one `<h1>` per page (goals title / settings title / onboarding step
  title / 404 numeral / error title); goal names are `<h2>`. Onboarding headline & welcome
  body are `<p>` (not headings).
- **Landmarks:** the `/goals` footer sits **inside** `<main>` (§6). Per ARIA in HTML
  a `<footer>` scoped to `main` is *not* a `contentinfo` landmark — so the reference
  ships no `contentinfo` on this screen. Testing-library resolves it as one anyway,
  which is why `getByRole("contentinfo")` works in the suite and would stop working
  on a dependency bump rather than on a change to the markup.

  The gap is in **`@testing-library/dom`**, not in `aria-query`. `aria-query@5.3.0`
  models the rule correctly and names `main` explicitly — `footer` "scoped to the
  body element" maps to `contentinfo`, and `footer` "scoped to the main element"
  maps to `generic`. But `makeElementSelector` (`dist/role-helpers.js`) builds its
  selector from a concept's `name` and `attributes` only, reading `constraints`
  solely at the attribute level, so concept-level ancestry constraints are
  discarded and both footer concepts collapse to a bare `footer` selector. Anyone
  checking `aria-query` will find correct data and conclude the hazard is gone; it
  is untouched.
- **Labelling:** form fields use shadcn `<Label htmlFor>` bound to input `id`s (onboarding
  `Field` component, goal dialog). Settings labels are **not** associated via `htmlFor`/`id`
  (labels present but not programmatically linked to inputs).
- **Focus management:** `autoFocus` on the first meaningful field of steps 1 & 2, and on the
  goal-dialog name input. Radix Dialog traps focus; provides `sr-only` "Close".
- **Focus ring treatment:** big audit inputs suppress the ring (`focus-visible:ring-0`) and
  instead turn the bottom border accent (`focus-visible:border-accent`). shadcn primitives use
  `focus-visible:ring-1 focus-visible:ring-ring` (ring = accent/orange).
- **aria:** progress-bar segments and the threshold midpoint marker are `aria-hidden`. No
  `aria-label`s beyond the dialog close `sr-only`. No `aria-live` region for the toast beyond
  sonner defaults. The `*` after cut-months has no accessible explanation.
- **Reduced motion:** **not handled** — no `prefers-reduced-motion` guards; `animate-slide-up`
  and `animate-scale-in-x` always run. (`tw-animate-css` may bring its own, but the custom
  keyframes here have no reduced-motion variant.)

---

## 12. DEPENDENCIES

From `package.json`.

### dependencies
`@hookform/resolvers ^5.2.2`, `@radix-ui/react-accordion ^1.2.12`,
`@radix-ui/react-alert-dialog ^1.1.15`, `@radix-ui/react-aspect-ratio ^1.1.8`,
`@radix-ui/react-avatar ^1.1.11`, `@radix-ui/react-checkbox ^1.3.3`,
`@radix-ui/react-collapsible ^1.1.12`, `@radix-ui/react-context-menu ^2.2.16`,
`@radix-ui/react-dialog ^1.1.15`, `@radix-ui/react-dropdown-menu ^2.1.16`,
`@radix-ui/react-hover-card ^1.1.15`, `@radix-ui/react-label ^2.1.8`,
`@radix-ui/react-menubar ^1.1.16`, `@radix-ui/react-navigation-menu ^1.2.14`,
`@radix-ui/react-popover ^1.1.15`, `@radix-ui/react-progress ^1.1.8`,
`@radix-ui/react-radio-group ^1.3.8`, `@radix-ui/react-scroll-area ^1.2.10`,
`@radix-ui/react-select ^2.2.6`, `@radix-ui/react-separator ^1.1.8`,
`@radix-ui/react-slider ^1.3.6`, `@radix-ui/react-slot ^1.2.4`,
`@radix-ui/react-switch ^1.2.6`, `@radix-ui/react-tabs ^1.1.13`,
`@radix-ui/react-toggle ^1.1.10`, `@radix-ui/react-toggle-group ^1.1.11`,
`@radix-ui/react-tooltip ^1.2.8`, `@tailwindcss/vite ^4.2.1`,
`@tanstack/react-query ^5.101.1`, `@tanstack/react-router ^1.170.16`,
`@tanstack/react-start ^1.168.26`, `@tanstack/router-plugin ^1.168.18`,
`class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `cmdk ^1.1.1`, `date-fns ^4.1.0`,
`embla-carousel-react ^8.6.0`, `input-otp ^1.4.2`, `lucide-react ^0.575.0`,
`react ^19.2.0`, `react-day-picker ^9.14.0`, `react-dom ^19.2.0`,
`react-hook-form ^7.71.2`, `react-resizable-panels ^4.6.5`, `recharts ^2.15.4`,
`sonner ^2.0.7`, `tailwind-merge ^3.5.0`, `tailwindcss ^4.2.1`,
`tw-animate-css ^1.3.4`, `vaul ^1.1.2`, `vite-tsconfig-paths ^6.0.2`, `zod ^3.24.2`.

### devDependencies
`@eslint/js ^9.32.0`, `@lovable.dev/vite-tanstack-config ^2.7.7`, `@types/node ^22.16.5`,
`@types/react ^19.2.0`, `@types/react-dom ^19.2.0`, `@vitejs/plugin-react ^5.2.0`,
`eslint ^9.32.0`, `eslint-config-prettier ^10.1.1`, `eslint-plugin-prettier ^5.2.6`,
`eslint-plugin-react-hooks ^5.2.0`, `eslint-plugin-react-refresh ^0.4.20`,
`globals ^15.15.0`, `nitro 3.0.260603-beta`, `prettier ^3.7.3`, `typescript ^5.8.3`,
`typescript-eslint ^8.56.1`, `vite ^8.0.16`.

### Actually imported by in-scope routes/components
`react`, `react-dom`, `@tanstack/react-router`, `@tanstack/react-query`,
`@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-slider`,
`@radix-ui/react-select`, `@radix-ui/react-dialog`, `class-variance-authority`,
`clsx`, `tailwind-merge`, `lucide-react` (Plus, Check, ChevronDown, ChevronUp, X),
`sonner`, `zod`, `tailwindcss` + `tw-animate-css` (via CSS), `@tailwindcss/vite`,
`@tanstack/react-start`/`@lovable.dev/vite-tanstack-config` (build tooling).

### Unused Lovable scaffolding (present but not used by in-scope screens)
`@hookform/resolvers`, `react-hook-form`, `date-fns`, `react-day-picker`,
`embla-carousel-react`, `cmdk`, `input-otp`, `react-resizable-panels`, `recharts`,
`vaul`, and the many unused `@radix-ui/*` packages (accordion, alert-dialog, aspect-ratio,
avatar, checkbox, collapsible, context-menu, dropdown-menu, hover-card, menubar,
navigation-menu, popover, progress, radio-group, scroll-area, separator, switch, tabs,
toggle, toggle-group, tooltip) — plus their corresponding `src/components/ui/*` files.

---

## 13. OPEN QUESTIONS

1. **Spanish / i18n toggle:** the `.lovable/plan.md` describes an ES/EN toggle and
   `affordo.lang` persistence, but the shipped code has a single English dict and **no
   language state, toggle, or persistence**. Which is authoritative for the rebuild?
   (Dict includes `step`/`of`/`profile` keys that are never rendered — leftovers.)
2. **og:image:** none exists. Is a social preview image desired, or intentionally omitted?
3. **Dark mode:** fully tokenized and referenced (`dark:` classes) but unreachable (no
   toggle, `.dark` never applied). Ship light-only, or wire a toggle?
4. **`*` footnote:** the "Time to save" value can render `{cutMonths} months *` with no
   explanation of the asterisk anywhere. Intended, or an unfinished footnote?
5. **Threshold marker position:** the goal-card bar marker is hard-coded to `left: 50%`
   (`Math.min(100, 50)`), which corresponds to `pct === threshold` given `pctForBar` scales by
   `threshold*2`. Confirm this fixed-midpoint marker is intended vs. a bug.
6. **`hasProfile` heuristic:** presence of a profile is inferred solely from `salary > 0`.
   A legitimately zero salary would be treated as "no profile." Acceptable?
7. **`windfall` / duplicate action:** the plan references a `windfall` term in the afford
   condition and a "Duplicate" goal action; neither exists in the shipped `evaluate` or
   `GoalCard`. Out of scope for the rebuild?
8. **Number parsing:** `num()` only swaps `,`→`.` and `parseFloat`s; it does not strip
   thousands separators, so `1.234,56`-style input would misparse. Match verbatim or fix?
9. **`toLocaleDateString("en-US")`** for goal dates is hard-coded regardless of currency
   locale. Intended?
10. **Favicon only** (`.ico`, 20 KB); no PWA manifest / apple-touch-icon. Needed?

---

## 14. ROUTING

- **Library:** `@tanstack/react-router` `^1.170.16` (with `@tanstack/react-start ^1.168.26`,
  `@tanstack/router-plugin ^1.168.18`). File-based routing; `src/routeTree.gen.ts` is
  auto-generated (do not hand-edit).
- **Router creation** (`src/router.tsx`): `createRouter({ routeTree, context: { queryClient }, scrollRestoration: true, defaultPreloadStaleTime: 0 })`. A fresh `QueryClient` is created per `getRouter()` call.
- **Root** (`src/routes/__root.tsx`): `createRootRouteWithContext<{ queryClient: QueryClient }>()`. Provides `head()` (see §1), `shellComponent: RootShell` (`<html lang="en">` + `<head><HeadContent/></head>` + `<body>{children}<Scripts/></body>`), `component: RootComponent` (wraps `<Outlet/>` in `QueryClientProvider` → `AffordoProvider` and mounts `<Toaster position="top-center" />`), `notFoundComponent: NotFoundComponent`, `errorComponent: ErrorComponent`.

### Route table (all children of `__root`)

| id / path | file | component | fullPath | pattern |
| --- | --- | --- | --- | --- |
| `/` | `routes/index.tsx` | `IndexRedirect` | `/` | index / static |
| `/goals` | `routes/goals.tsx` | `GoalsPage` | `/goals` | static |
| `/onboarding` | `routes/onboarding.tsx` | `OnboardingWizard` | `/onboarding` | static |
| `/settings` | `routes/settings.tsx` | `SettingsPage` | `/settings` | static |

- **No** nested/layout routes (`_layout`), **no** dynamic (`$param`), **no** optional
  (`{-$x}`), **no** splat (`$`) routes. Flat tree: all four are direct children of `__root`.
- **Index route** `/` is a pure redirect gate (renders no lasting UI).
- **404 route:** `notFoundComponent` on the root (`NotFoundComponent`) — catches unmatched
  paths; full-screen `404` / `Page not found` / `Go home` (link `to="/"`).
- **Error route:** `errorComponent` on the root (`ErrorComponent`) — logs via
  `reportLovableError(error, { boundary: "tanstack_root_error_component" })`; offers
  `Try again` (`router.invalidate()` + `reset()`) and `Go home` (`<a href="/">`).

### Redirects & route guards (gating conditions)

- **`/` (`IndexRedirect`):** if `!hydrated` → renders `loading…` line; else
  `<Navigate to={hasProfile ? "/goals" : "/onboarding"} />`. `hasProfile = hydrated && profile.salary > 0`.
- **`/goals` (`GoalsPage`):** if `!hydrated` → `loading…`; if `!hasProfile` → `<Navigate to="/onboarding" />`.
- **`/settings` (`SettingsPage`):** if `!hydrated` → `return null`; if `!hasProfile` → `<Navigate to="/onboarding" />`.
- **`/onboarding`:** no guard — always renders the wizard (even if a profile already exists;
  the draft is seeded from the existing profile if `profile.salary > 0`).
- Navigation actions: onboarding finish → `navigate({ to: "/goals" })`; settings reset →
  `navigate({ to: "/onboarding" })`; settings save → stays (toast only). Header brand link →
  `/goals`; header settings link → `/settings` (only when `hasProfile`).

---

## 15. WIZARD MECHANICS

Component: `src/components/affordo/OnboardingWizard.tsx`.

- **Where step state lives:** local component state `const [step, setStep] = useState(0)` —
  a single integer `0..3`. **Not** in the router, **not** in the URL, **not** in localStorage.
- **Draft state:** `const [draft, setDraft] = useState<Profile>(profile.salary > 0 ? profile : defaultProfile)` — a full `Profile` object edited in place via `update(key, value)`. Also local, not persisted until finish.
- **Step labels:** `steps = [t("stepWelcomeLabel"), t("stepIncomeLabel"), t("stepExpensesLabel"), t("stepRulesLabel")]` → `["Welcome","Income","Expenses","Rules"]`; `steps.length === 4`.
- **Advance (`next()`):** if `step < steps.length - 1` → `setStep(step + 1)`; else (last step) → `setProfile(draft)` then `navigate({ to: "/goals" })`. Wired to the right-hand primary Button's `onClick`. There is **no** Enter-key handler in the shipped code (the plan mentioned "Enter avanza" but no keydown listener exists; number inputs are not in a `<form>` here).
- **Reverse (Back):** `onClick={() => setStep(Math.max(0, step - 1))}` — clamps at 0.
- **Gating / validation:** `canContinue = step !== 1 || (draft.salary > 0 && draft.hoursPerWeek > 0 && draft.hoursPerDay > 0 && draft.paymentsPerYear > 0)`. So **only step 1 (Income) is gated**; steps 0, 2, 3 always allow advance. The primary Button is `disabled={!canContinue}`.
- **Failed advance behaviour:** the button is simply disabled (greyed, `pointer-events-none`, `opacity-50`). No error message, no toast, no shake — advance is impossible until the four income fields are `> 0`.
- **Step 0 Back control:** **rendered but disabled** (`disabled={step === 0}`), not hidden and does not navigate away. It stays visible as a greyed `← Back`.
- **Final step action:** on step 3 the primary button reads `Finish setup →`; clicking it persists the draft (`setProfile`) and lands on `/goals`.
- **Refresh persistence:** step and draft are **lost on refresh** (component-local state). On reload of `/onboarding`, `step` resets to `0` and `draft` re-seeds from the stored profile (or `defaultProfile`). Only a *completed* profile survives (in `affordo.profile`).
- **Deep-linkability:** steps are **not** deep-linkable — there is a single `/onboarding` URL for all four steps; no query param or hash reflects `step`.

---

## 16. PER-STEP TEARDOWN

Shared shell (present on every step, from `OnboardingWizard.tsx`) — reproduced per step below
only where the source literally renders it:

- Page root: `<div className="min-h-dvh bg-background">` with `<AppHeader showTimeValue={false} />`.
- Main: `<main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">`.
- Header row: `<div className="mb-8 flex items-end justify-between gap-4">` → left `<div>` holds eyebrow `<p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{onboardingTitle}</p>` and heading `<h1 className="mt-2 font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl">{steps[step]}</h1>`; right counter `<span className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{NN} / 04</span>`.
- Progress bar: `<div className="mb-10 flex gap-1.5">` with 4 `<div className="h-1 flex-1 (bg-foreground|bg-border)" aria-hidden />`.
- Body wrapper: `<div key={step} className="animate-slide-up space-y-8">`.
- Footer: `<div className="mt-12 flex items-center justify-between border-t border-border pt-6">` → Back `<Button variant="ghost" className="font-mono text-[11px] font-bold uppercase tracking-widest">← Back</Button>` and primary `<Button className="rounded-none bg-foreground px-6 py-6 font-mono text-[11px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground">{label} →</Button>`.

**The eyebrow (`Set up your reckoning`), the counter, the progress bar, and both footer buttons
are identical markup on all four steps** — the source factors them out (they live outside the
`{step === N}` conditionals), so they are genuinely shared, not per-step. Only the heading text,
the body block, and the footer button *labels* differ per step.

### STEP 0 — Welcome
- **Counter string:** `01 / 04`
- **Eyebrow:** `Set up your reckoning`
- **Heading (h1):** `Welcome`
- **Body block** (`<div className="space-y-6">`):
  - Kicker `<p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">`: `Before you buy`
  - Headline `<p className="font-display text-3xl uppercase leading-tight tracking-tight sm:text-4xl">`: `Measure any purchase in hours of your life.`
  - Body `<p className="max-w-prose text-base leading-relaxed text-muted-foreground">`: `Affordo turns your salary into a time budget, then weighs every goal against it. Set your income once, then add a goal any time you're tempted to spend.`
- **Fields:** none.
- **Back button:** `← Back` (disabled). **Primary button:** `Start →`.

### STEP 1 — Income
- **Counter string:** `02 / 04`
- **Eyebrow:** `Set up your reckoning`
- **Heading (h1):** `Income`
- **Body:** wrapped in a React fragment (`<>…</>`); fields use the `Field` component
  (`<div className="space-y-2">` + mono label + child + optional hint).
  - **Currency** — label `Currency`; `Select` (trigger class `bigInputClass + " h-auto"`); options `EUR — €` / `GBP — £` / `USD — $`; no placeholder (bound value).
  - **Net monthly salary** — label `Net monthly salary`; `<Input id="salary" type="number" inputMode="decimal" className={bigInputClass} placeholder="0" autoFocus />`.
  - Two-col grid `<div className="grid gap-8 sm:grid-cols-2">`:
    - **Hours per week** — label `Hours per week`; `<Input id="hoursPerWeek" type="number" className={bigInputClass} />` (no placeholder).
    - **Hours per day** — label `Hours per day`; `<Input id="hoursPerDay" type="number" className={bigInputClass} />` (no placeholder).
  - **Payments per year** — label `Payments per year`; `<Input id="paymentsPerYear" type="number" className={bigInputClass} />`; hint `Use 14 for Spanish-style extra payments.`
- `bigInputClass` = `"w-full border-0 border-b-2 border-border bg-transparent px-0 py-2 text-3xl font-bold outline-none transition-colors focus-visible:border-accent focus-visible:ring-0 rounded-none shadow-none"`.
- **Back button:** `← Back` (enabled). **Primary button:** `Continue →` (disabled until all four income fields `> 0`).

### STEP 2 — Expenses
- **Counter string:** `03 / 04`
- **Eyebrow:** `Set up your reckoning`
- **Heading (h1):** `Expenses`
- **Body** (fragment, single `Field`):
  - **Monthly fixed expenses** — label `Monthly fixed expenses`; `<Input id="expenses" type="number" inputMode="decimal" className={bigInputClass} placeholder="0" autoFocus />`; hint `Rent, groceries, subscriptions, transport, utilities.`
- **Back button:** `← Back` (enabled). **Primary button:** `Continue →` (never gated on this step).

### STEP 3 — Rules
- **Counter string:** `04 / 04`
- **Eyebrow:** `Set up your reckoning`
- **Heading (h1):** `Rules`
- **Body** (fragment):
  - **Significance threshold** — `Field` label is the interpolated string `Significance threshold — {draft.threshold}%`; hint `Purchases above this % of your monthly income are flagged.`; control `<Slider id="threshold" min={1} max={50} step={1} value={[draft.threshold]} className="pt-3" />`.
  - Two-col grid `<div className="grid gap-8 sm:grid-cols-2">`:
    - **Current savings** — label `Current savings`; `<Input id="savings" type="number" className={bigInputClass} placeholder="0" />`.
    - **Extra monthly savings (optional)** — label `Extra monthly savings (optional)`; `<Input id="monthlyContribution" type="number" className={bigInputClass} placeholder="0" />`; hint `Money you consistently set aside on top of expenses.`
- **Back button:** `← Back` (enabled). **Primary button:** `Finish setup →` → persists profile, navigates to `/goals`.

Button-label logic (verbatim): `{step === 0 ? t("start") : step === steps.length - 1 ? t("finish") : t("continue")} →` — i.e. `Start →` on step 0, `Finish setup →` on step 3, `Continue →` on steps 1–2; the ` →` suffix is always appended. Back label is always `← ` + `t("back")` = `← Back`.

---

## 17. TRANSITIONS BETWEEN SCREENS

- **Between wizard steps:** the body wrapper `<div key={step} className="animate-slide-up …">`
  changes its React `key` on every step change, forcing a remount that re-runs the
  `slide-up` animation. Definition (`styles.css`):
  `animation: slide-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;` where `slide-up` is
  `opacity 0→1` and `transform: translateY(16px) → translateY(0)`.
  - **Duration:** 0.5s. **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)` (ease-out-ish). **Fill:** `both`.
  - **Direction-awareness:** **none** — forward and backward step changes play the *same*
    upward slide-in; there is no reverse/exit variant and no left/right directionality.
  - **Exit animation:** **none** — the outgoing step is unmounted instantly (no fade/slide out);
    only the incoming step animates in.
  - Only the body column animates; the header, counter, progress bar and footer do not
    re-animate on step change (they live outside the keyed wrapper). The progress-bar segment
    colors flip instantly (no transition defined on them).
- **Threshold-bar fill (goals screen):** `animate-scale-in-x` —
  `animation: scale-in-x 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; transform-origin: left;`
  (`scaleX 0→1`), runs on goal-card mount.
- **Route transitions (between `/onboarding`, `/goals`, `/settings`):** no custom page
  transition — TanStack Router swaps the `<Outlet>` content directly; `scrollRestoration: true`
  is set on the router. Dialog and Select use `tw-animate-css` fade/zoom/slide data-state
  animations (see §9).
- **`prefers-reduced-motion`:** **not handled anywhere** — neither the custom keyframes
  (`slide-up`, `scale-in-x`) nor the `@utility` wrappers include a reduced-motion guard, and
  no media query disables them. Animations always play regardless of the user's OS setting.
  (`tw-animate-css` ships its own reduced-motion handling for its `animate-in`/`fade`/`zoom`
  utilities, but that does not cover these two project-defined animations.)

---

## TARGET CONSTRAINTS (v2 — recorded verbatim, authoritative for the rebuild)

**Full parity.** The rebuild reproduces the reference app as it is, not a simplified version
of it. Everything previously asked to be dropped is now **in scope** and must be preserved
exactly:
- The router and every route.
- The four-step onboarding wizard and its step state.
- The `01 / 04` step counter, in its exact format and position.
- The `← Back` and `Start →` controls, verbatim, arrows included.
- Any progress indicator, step transition, or animation between steps.

There is **no** single-page collapse. There is **no** merging of steps.

**Still out of scope:** the calculation logic itself, which already exists in this project and
must not be touched. Step state, navigation state and form state are now **IN scope**, since
they are part of the UI being reproduced.

Fidelity bar is unchanged and absolute: **pixel-for-pixel and behaviour-for-behaviour** with
the reference. Nothing gets improved, simplified, modernized, or tidied. **If it looks like a
mistake, it is a requirement.**

> Supersession note: this v2 replaces the original TARGET CONSTRAINTS (which called for a
> single-page collapse, dropping the counter and Back control). That earlier version is void.
> Sections 1–13 already document the wizard, router, counter and controls in full, so nothing
> in them was omitted or flattened under the old constraints; §§14–17 add the routing/wizard
> depth the wider scope requires.
