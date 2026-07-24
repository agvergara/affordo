import { useState, type ReactNode } from "react";

export interface DisclosureProps {
  /** The always-visible label that toggles the panel. */
  summary: string;
  /**
   * Whether the panel starts open. Defaults to collapsed (ADR 0006), but a
   * stage opens it when it already holds a value — so a refinement that drives
   * a visible answer (e.g. a persisted Windfall behind an "Affordable Now") is
   * never a hidden driver the user has to hunt for.
   */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * A collapsed-by-default refinement panel — ADR 0006's "make this more
 * accurate", never a required door field. Native <details>/<summary> gives
 * keyboard and screen-reader behaviour for free; the open state is seeded from
 * `defaultOpen` and then owned by the user's toggles.
 */
export function Disclosure({
  summary,
  defaultOpen = false,
  children,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="mt-3 rounded-lg border border-border bg-card px-3 py-2"
    >
      <summary className="cursor-pointer select-none text-sm text-stone">
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
