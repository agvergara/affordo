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

/** Reference colours per kind (§5): green afford, black stretch, accent cut, red cannot. */
const STYLES: Record<ReferenceVerdictKind, string> = {
  afford: "bg-emerald-600 text-white",
  stretch: "bg-foreground text-background",
  cutToAfford: "bg-accent text-accent-foreground",
  cannot: "bg-destructive text-destructive-foreground",
};

export function VerdictBadge({ kind }: { kind: ReferenceVerdictKind }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${STYLES[kind]}`}
    >
      {LABELS[kind]}
    </span>
  );
}
