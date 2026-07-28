import { evaluateReference } from "../engine";
import { useAffordo } from "../state/AffordoProvider";
import { useTheme } from "../state/ThemeProvider";
import { formatMoney } from "./localeFormat";

export interface AppHeaderProps {
  /** Hide the time-value chip (used by the onboarding wizard). Default true. */
  showTimeValue?: boolean;
}

/**
 * The sticky top bar (docs/affordo-context.md §5). Brand wordmark linking to
 * `/goals`; a Settings link once a profile exists; and a time-value chip
 * showing the Net Hourly Wage on `sm`+ when a profile exists and the rate is
 * positive. Class strings reproduce the reference verbatim.
 */
export function AppHeader({ showTimeValue = true }: AppHeaderProps) {
  const { profile, hasProfile } = useAffordo();

  // Derive the Net Hourly Wage via the reference engine with a price-0 goal,
  // exactly as the reference AppHeader does; only the hourlyRate is used.
  const hourly = hasProfile
    ? evaluateReference(profile, { price: 0 }).hourlyRate
    : 0;

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
        <a
          href="/goals"
          className="font-mono text-[11px] font-bold uppercase tracking-widest"
        >
          Affordo
        </a>
        <div className="flex min-w-0 items-center gap-4">
          {showTimeValue && hasProfile && hourly > 0 && (
            <span
              data-testid="time-value"
              className="hidden truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline"
            >
              Time value:{" "}
              <span className="text-foreground">
                {formatMoney(hourly, profile.currency)} / hour
              </span>
            </span>
          )}
          {hasProfile && (
            <a
              href="/settings"
              className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Settings
            </a>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

/**
 * The theme toggle (#72). The reference ships no such control — dossier §10
 * records dark mode as "latent/unreachable via UI" — so there is no verbatim
 * class string to reproduce here; ADR 0021 puts dark mode in scope and defers
 * this UI to its own slice. It borrows the Settings link's muted-to-foreground
 * treatment so it reads as part of the same header group.
 */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Switch to dark theme"
      className="text-muted-foreground hover:text-foreground"
    />
  );
}
