# CLAUDE.md

The working agreements for this repository live in **[`AGENTS.md`](AGENTS.md)**.
Read that file; it is the canonical one, and this exists so Claude Code finds it
by its own convention rather than duplicating it.

Two things worth knowing before you read it:

- **The reference app is readable, and it is the authority.**
  `agvergara/dream-purchase-planner`, via
  `gh api repos/agvergara/dream-purchase-planner/contents/<path> --jq '.content' | base64 -d`.
  Questions about what the app should do or look like are answered by reading it,
  not by reasoning from `docs/affordo-context.md` — that file is an extraction,
  and its silence is not evidence.

- **The unit suite is blind to anything visual.** jsdom applies no stylesheet, so
  geometry, colour, focus rings and hit targets need a browser measurement or they
  are not verified. This is the single most common way a change here has looked
  correct and been wrong.
