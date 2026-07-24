import type { ReactNode } from "react";

/**
 * Additive reveal: renders its children with a gentle entrance animation as
 * they appear, so each answer slides in below the inputs without hiding or
 * reflowing what's above. The animation is disabled under
 * `prefers-reduced-motion` (see `theme.css`). Reused by the later stages.
 */
export function Reveal({ children }: { children: ReactNode }) {
  return <div className="reveal">{children}</div>;
}
