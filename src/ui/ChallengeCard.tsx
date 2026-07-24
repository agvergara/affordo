import type { WorkTimeUnit } from "../engine";
import { formatChallenge } from "./format";

export interface ChallengeCardProps {
  value: number;
  unit: WorkTimeUnit;
}

/**
 * The think-twice Challenge (ADR 0010): provocative but never shaming, shown
 * when a purchase crosses the Significance Threshold. Presentational — it takes
 * the Time Cost figure and renders the challenge copy in an accent card.
 */
export function ChallengeCard({ value, unit }: ChallengeCardProps) {
  return (
    <p
      data-testid="challenge"
      className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm"
    >
      {formatChallenge(value, unit)}
    </p>
  );
}
