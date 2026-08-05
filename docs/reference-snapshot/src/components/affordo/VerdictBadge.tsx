import type { VerdictKind } from "@/lib/affordability";
import { useAffordo } from "@/lib/affordo-context";
import { cn } from "@/lib/utils";

const styles: Record<VerdictKind, string> = {
  afford: "bg-emerald-600 text-white",
  stretch: "bg-foreground text-background",
  cutToAfford: "bg-accent text-accent-foreground",
  cannot: "bg-destructive text-destructive-foreground",
};

export function VerdictBadge({ kind }: { kind: VerdictKind }) {
  const { t } = useAffordo();
  const label = {
    afford: t("verdictAfford"),
    stretch: t("verdictStretch"),
    cutToAfford: t("verdictCut"),
    cannot: t("verdictCannot"),
  }[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest",
        styles[kind],
      )}
    >
      {label}
    </span>
  );
}
