import type { ReferenceVerdictKind } from "../engine";

/**
 * The verdict badge shown on a Goal card (docs/affordo-context.md §5).
 *
 * One span per Affordability Verdict kind, carrying the reference label and the
 * reference colour. The labels are the dossier's copy verbatim (§6).
 */
const LABELS: Record<ReferenceVerdictKind, string> = {
  afford: "Afford",
  stretch: "Stretch",
  cutToAfford: "Cut to afford",
  cannot: "Cannot",
};

export function VerdictBadge({ kind }: { kind: ReferenceVerdictKind }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest">
      {LABELS[kind]}
    </span>
  );
}
