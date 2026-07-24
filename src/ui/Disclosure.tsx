import type { ReactNode } from "react";

export interface DisclosureProps {
  /** The always-visible label that toggles the panel. */
  summary: string;
  children: ReactNode;
}

/**
 * A collapsed-by-default refinement panel — ADR 0006's "make this more
 * accurate", never a required door field. Native <details>/<summary> gives
 * keyboard and screen-reader behaviour for free.
 */
export function Disclosure({ summary, children }: DisclosureProps) {
  return (
    <details className="mt-3 rounded-lg border border-border bg-card px-3 py-2">
      <summary className="cursor-pointer select-none text-sm text-stone">
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
