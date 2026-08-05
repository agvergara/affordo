# CLAUDE.md

The working agreements for this repository live in **[`AGENTS.md`](AGENTS.md)**.
Read that file; it is the canonical one, and this exists so Claude Code finds it
by its own convention rather than duplicating it.

Two things worth knowing before you read it:

- **The reference app is gone.** `agvergara/dream-purchase-planner` was private
  and has been deleted, so every instruction in this repo's history to `gh api`
  it is dead. `docs/affordo-context.md` is now the only record — read its
  coverage table first, and treat silence outside the exhaustive sections as
  _unknown_ rather than as evidence either way. `AGENTS.md` records what the
  reference was and the shadcn base classes that proved load-bearing.

- **The unit suite is blind to anything visual.** jsdom applies no stylesheet, so
  geometry, colour, focus rings and hit targets need a browser measurement or they
  are not verified. This is the single most common way a change here has looked
  correct and been wrong.
