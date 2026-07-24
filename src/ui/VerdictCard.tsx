import type { Settings, Verdict } from "../engine";
import { formatVerdict } from "./format";

/**
 * Per-outcome card styling. ADR 0010 forbids shaming, so there is no alarm-red:
 * Affordable Now reads calm-positive, Not Reachable reads constructive
 * (slate/blue) and leads with the expense lever, and a Save-Up horizon stays
 * neutral (the plain card).
 */
const VARIANT: Record<Verdict["kind"], string> = {
  "affordable-now": "border-positive/40 bg-positive-bg text-positive",
  "save-up": "border-border bg-card",
  "not-reachable":
    "border-constructive/40 bg-constructive-bg text-constructive",
};

export interface VerdictCardProps {
  verdict: Verdict;
  currency: Settings["currency"];
}

/** The Affordability Verdict rendered as its outcome's card. Presentational. */
export function VerdictCard({ verdict, currency }: VerdictCardProps) {
  return (
    <div
      data-testid="verdict"
      data-verdict={verdict.kind}
      className={`mt-3 rounded-xl border p-4 ${VARIANT[verdict.kind]}`}
    >
      {formatVerdict(verdict, currency)}
    </div>
  );
}
