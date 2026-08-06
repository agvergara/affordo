import { evaluateReference } from "../engine";
import { useAffordo } from "../state/AffordoProvider";
import { useTheme } from "../state/ThemeProvider";
import { formatMoney } from "./localeFormat";

interface AppHeaderProps {
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
        {/*
          `py-2` is a hit-area fix, not a layout one (ADR 0022). The row is
          `h-14` with `items-center`, so padding on a child changes nothing
          visible — the link stays the same size and in the same place, and its
          target grows from 54x17 to clear WCAG 2.2 §2.5.8's 24x24 floor.
        */}
        <a
          href="/goals"
          className="-my-2 inline-flex items-center py-2 font-mono text-[11px] font-bold uppercase tracking-widest"
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
          {/*
            The Comparison link (#155). The reference has no such route, so
            there is no verbatim string to reproduce — ADR 0023 says compose,
            and the nearest existing analogue governs, so this is the Settings
            link's treatment exactly, down to the `-my-2 py-2` hit area. That is
            the same move ADR 0021's theme toggle made for the same reason, and
            it is why the header still reads as one group rather than as two
            links and a newcomer.
          */}
          {hasProfile && (
            <a
              href="/compare"
              className="-my-2 inline-flex items-center py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Compare
            </a>
          )}
          {hasProfile && (
            <a
              href="/settings"
              // `-my-2 py-2` as on the brand link: pure hit area, no layout
              // change inside the `h-14` row (ADR 0022).
              className="-my-2 inline-flex items-center py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
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
 *
 * `border-0 bg-transparent p-0` is load-bearing, not tidying: theme.css gives
 * every bare `<button>` a bordered, `--card`-filled, rounded pill in the base
 * layer, which would otherwise render this as a pill in a header of bare text
 * links. Every other button in the app neutralizes the same rule the same way
 * (the wizard's `← Back` is the closest analogue).
 *
 * Zeroing that padding also zeroes the hit area down to the icon's own 16x16,
 * so the box is restored explicitly: `h-8 w-8` centring the glyph gives a 32px
 * target (WCAG 2.5.8 asks 24x24) without changing the icon's rendered size.
 */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {theme === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

/**
 * Shared geometry for the two glyphs, matching `lucide-react`'s defaults — the
 * icon set the reference draws from (dossier §5) but which this port does not
 * depend on, so the two icons it needs are inlined rather than pulling in the
 * library. `currentColor` lets the button's text colour drive the stroke, so
 * the icon inherits the muted/hover treatment for free.
 */
const iconProps = {
  className: "h-4 w-4",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** Shown while the light theme is active — the icon reflects the current theme. */
function SunIcon() {
  return (
    <svg {...iconProps} data-testid="theme-icon-sun">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

/** Shown while the dark theme is active — the icon reflects the current theme. */
function MoonIcon() {
  return (
    <svg {...iconProps} data-testid="theme-icon-moon">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
