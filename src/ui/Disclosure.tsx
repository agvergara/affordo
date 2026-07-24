import type { ReactNode } from "react";

export interface DisclosureProps {
  /** The always-visible label that toggles the panel. */
  summary: string;
  /** Whether the panel is open. Owned by the parent so it survives the stage
   *  unmounting/remounting when the price toggles in and out of validity. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * A refinement panel — ADR 0006's "make this more accurate", never a required
 * door field. Native <details>/<summary> gives keyboard and screen-reader
 * behaviour for free; open/closed is a controlled value the parent owns, so a
 * user's collapse isn't undone when the surrounding stage remounts.
 */
export function Disclosure({
  summary,
  open,
  onOpenChange,
  children,
}: DisclosureProps) {
  return (
    <details
      open={open}
      onToggle={(e) => onOpenChange(e.currentTarget.open)}
      className="mt-3 rounded-lg border border-border bg-card px-3 py-2"
    >
      <summary className="cursor-pointer select-none text-sm text-stone">
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
