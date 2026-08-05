# CLAUDE.md

The working agreements for this repository live in **[`AGENTS.md`](AGENTS.md)**.
Read that file; it is the canonical one, and this exists so Claude Code finds it
by its own convention rather than duplicating it.

Two things worth knowing before you read it:

- **The reference repo is deleted, but archived here.** Every instruction in this
  repo's history to `gh api agvergara/dream-purchase-planner` is dead; read
  [`docs/reference-snapshot/`](docs/reference-snapshot/) instead — all 86 files,
  verbatim. `docs/affordo-context.md` is the organised extraction and the better
  starting point, but the snapshot is what it was derived from and wins where
  they disagree.

- **The unit suite is blind to anything visual.** jsdom applies no stylesheet, so
  geometry, colour, focus rings and hit targets need a browser measurement or they
  are not verified. This is the single most common way a change here has looked
  correct and been wrong.
