import { Link } from "@tanstack/react-router";
import { useAffordo } from "@/lib/affordo-context";
import { formatMoney } from "@/lib/format";
import { evaluate } from "@/lib/affordability";

export function AppHeader({ showTimeValue = true }: { showTimeValue?: boolean }) {
  const { profile, hasProfile, t } = useAffordo();
  const hourly = hasProfile
    ? evaluate(profile, { id: "_", name: "_", price: 0, note: "", createdAt: 0 }).hourlyRate
    : 0;

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/goals" className="font-mono text-[11px] font-bold uppercase tracking-widest">
          {t("brand")}
        </Link>
        <div className="flex min-w-0 items-center gap-4">
          {showTimeValue && hasProfile && hourly > 0 ? (
            <span className="hidden truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
              {t("hourlyRate")}:{" "}
              <span className="text-foreground">
                {formatMoney(hourly, profile.currency)} {t("perHour")}
              </span>
            </span>
          ) : null}
          {hasProfile ? (
            <Link
              to="/settings"
              className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              {t("settings")}
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
