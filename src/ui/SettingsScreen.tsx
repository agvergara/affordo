import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { useAffordo } from "../state/AffordoProvider";
import { useToast } from "./Toast";
import type { Profile } from "../state/profile-store";
import type { Currency } from "../engine/reference-types";

/**
 * `num(v)` (dossier §7): parse a field string with a comma-or-dot decimal
 * separator, falling back to 0 on NaN. Matches the reference onboarding/settings
 * helper — it accepts a decimal comma but not thousands separators.
 */
function num(v: string): number {
  const parsed = parseFloat(v.replace(",", "."));
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * How Reset everything asks the user to confirm. The reference calls
 * `window.confirm(t("resetConfirm"))` (dossier §2/§14), so that is the default;
 * tests inject a stub instead, which keeps a real blocking dialog out of the
 * suite. Mirrors the `navigate` seam the wizard already uses.
 */
export type Confirm = (message: string) => boolean;

const defaultConfirm: Confirm = (message) => window.confirm(message);

/**
 * How settings leaves for onboarding after a reset. Mirrors `Router`'s
 * `Navigate` (`(to: string) => void`): the client-only SPA (ADR 0004/0009/0018)
 * has no history router, so a redirect is a real location change; tests inject
 * a spy instead.
 */
export type Navigate = (to: string) => void;

const defaultNavigate: Navigate = (to) => window.location.replace(to);

/** The reference's `t("resetConfirm")` (dossier §6, Settings). */
const RESET_CONFIRM = "This will erase your profile and all goals. Continue?";

/**
 * The reference's shared `bigInput` (`settings.tsx:59`), verbatim, plus the one
 * class this port has to add.
 *
 * `border-0` is in the reference's own string — but it matters more here, since
 * `theme.css`'s base layer paints every `input`/`select` with a 1px border on
 * all four sides that `border-b-2` alone would not clear (#135). The reference
 * has no such base rule; it carries `border-0` to escape shadcn's `<Input>`.
 * Same string, two different things to undo.
 */
const bigInputClass =
  "w-full rounded-none border-0 border-b-2 border-border bg-transparent px-0 py-2 text-2xl font-bold shadow-none outline-none focus-visible:border-accent focus-visible:ring-0";

/** Every field label on this screen (`settings.tsx:77`). */
const labelClass =
  "font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

const CURRENCY_OPTIONS: ReadonlyArray<{ value: Currency; label: string }> = [
  { value: "EUR", label: "EUR — €" },
  { value: "GBP", label: "GBP — £" },
  { value: "USD", label: "USD — $" },
];

/**
 * The settings screen (dossier §2/§7). Renders the `<AppHeader />` plus the
 * editable profile fields, seeded from the current profile into a LOCAL draft.
 * Editing mutates only the draft; nothing is persisted until the user presses
 * Save (issue #68), which writes the draft back through `setProfile` and
 * confirms with a success toast (dossier §2/§6). "Reset everything" (#69) is
 * the one action that discards rather than edits: it confirms first, and only
 * then clears the profile and every goal and returns to `/onboarding`.
 *
 * The draft is seeded once, at mount, from the profile the provider holds. To
 * keep that seed from capturing the pre-hydration default (the provider renders
 * `defaultProfile` until its post-mount effect reads storage, dossier §8), the
 * form is gated on `hydrated` and keyed on it, so it mounts — and seeds — only
 * once the real profile is in hand. The Router already renders nothing on
 * `/settings` while hydrating (§14); this makes the seed correct even when the
 * screen is mounted directly.
 */
export function SettingsScreen({
  confirm = defaultConfirm,
  navigate = defaultNavigate,
}: {
  confirm?: Confirm;
  navigate?: Navigate;
} = {}) {
  const { profile, hydrated } = useAffordo();
  if (!hydrated) return null;
  return (
    <SettingsForm
      key="hydrated"
      profile={profile}
      confirm={confirm}
      navigate={navigate}
    />
  );
}

function SettingsForm({
  profile,
  confirm,
  navigate,
}: {
  profile: Profile;
  confirm: Confirm;
  navigate: Navigate;
}) {
  const { setProfile, clearProfile, clearGoals } = useAffordo();
  const { toast } = useToast();
  // Seed the draft once from the hydrated profile. This screen owns the draft;
  // the provider's profile is written only when the user presses Save.
  const [draft, setDraft] = useState<Profile>(profile);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Save persists the whole draft in one write, then confirms. The toast copy
  // is the reference's `t("save")` = "Save" (dossier §6).
  const save = () => {
    setProfile(draft);
    toast("Save");
  };

  // A positive salary is what makes a profile guard-valid (`hasProfile`,
  // dossier §14). The `/settings` guard ejects to `/onboarding` the instant it
  // goes false, so persisting a zero-salary draft would break §14's "settings
  // save → stays (toast only)". Rather than special-case the guard, express the
  // constraint the way the reference does everywhere else — by disabling the
  // primary action until the draft is valid (dossier §7, goal dialog).
  const canSave = draft.salary > 0;

  // Reset everything: confirm first, and do nothing at all if the user declines
  // (dossier §2/§14).
  const reset = () => {
    if (!confirm(RESET_CONFIRM)) return;
    clearProfile();
    clearGoals();
    navigate("/onboarding");
  };

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/*
          The same rule-topped masthead `/goals` opens with (`settings.tsx:66`).
          The `Affordo` eyebrow above the title is copy, not chrome — ours had
          neither the rule nor the eyebrow, so this was a missing string as well
          as missing geometry. `mb-10` on the masthead replaces the `mt-12` the
          fields carried.
        */}
        <div
          data-testid="settings-masthead"
          className="mb-10 border-t-4 border-foreground pt-6"
        >
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Affordo
          </p>
          <h1 className="mt-2 font-display text-6xl uppercase leading-none tracking-tight">
            Settings
          </h1>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <label
              htmlFor="settings-currency"
              data-testid="settings-field-label"
              className={labelClass}
            >
              Currency
            </label>
            <select
              id="settings-currency"
              value={draft.currency}
              onChange={(e) => set("currency", e.target.value as Currency)}
              // The reference's select takes `bigInput + " h-auto"`, since
              // shadcn's `SelectTrigger` is a button with a fixed height its
              // own base sets (`settings.tsx:81`).
              className={`${bigInputClass} h-auto`}
            >
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <NumberField
            id="settings-salary"
            label="Net monthly salary"
            value={draft.salary}
            onChange={(v) => set("salary", num(v))}
          />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <NumberField
              id="settings-hours-week"
              label="Hours per week"
              value={draft.hoursPerWeek}
              onChange={(v) => set("hoursPerWeek", num(v))}
            />
            <NumberField
              id="settings-hours-day"
              label="Hours per day"
              value={draft.hoursPerDay}
              onChange={(v) => set("hoursPerDay", num(v))}
            />
            <NumberField
              id="settings-payments"
              label="Payments per year"
              value={draft.paymentsPerYear}
              onChange={(v) => set("paymentsPerYear", num(v))}
            />
          </div>

          <NumberField
            id="settings-expenses"
            label="Monthly fixed expenses"
            value={draft.expenses}
            onChange={(v) => set("expenses", num(v))}
          />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <NumberField
              id="settings-savings"
              label="Current savings"
              value={draft.savings}
              onChange={(v) => set("savings", num(v))}
            />
            <NumberField
              id="settings-contribution"
              label="Extra monthly savings (optional)"
              value={draft.monthlyContribution}
              onChange={(v) => set("monthlyContribution", num(v))}
            />
          </div>

          {/*
            Threshold sits **last** in the reference, after the savings pair
            (`settings.tsx:140`). Ours followed the wizard's order, where it
            comes earlier — the two screens genuinely differ (#127).
          */}
          <div className="space-y-2">
            <label
              htmlFor="settings-threshold"
              data-testid="settings-field-label"
              className={labelClass}
            >
              Significance threshold — {draft.threshold}%
            </label>
            <input
              id="settings-threshold"
              type="range"
              min={1}
              max={50}
              step={1}
              value={draft.threshold}
              onChange={(e) => set("threshold", num(e.target.value))}
              className="w-full accent-accent pt-3"
            />
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
          <button
            type="button"
            onClick={reset}
            // The reference's `variant="ghost"` Button contributes `h-9 px-4
            // py-2` and `hover:bg-accent`; the route's className overrides only
            // the text colour (`settings.tsx:149`). Ours had `p-0`, so it had
            // no hit area beyond its own text.
            //
            // `border-0 bg-transparent` stay: they neutralise theme.css's
            // global `button` rule, which paints every bare button as a
            // bordered, --card-filled pill. The reference has no such rule
            // (#135).
            className="inline-flex h-9 items-center justify-center rounded-none border-0 bg-transparent px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-destructive transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Reset everything
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-none border-0 bg-foreground px-6 py-6 font-mono text-[11px] font-bold uppercase tracking-widest text-background shadow transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </main>
    </>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: string) => void;
}

/**
 * A settings number field in the reference "big audit" style. Binds
 * `value={value || ""}` so a `0` renders as an empty field with the `0`
 * placeholder visible (dossier §7), and `inputMode="decimal"` for a numeric
 * mobile keypad while still accepting a decimal comma.
 */
function NumberField({ id, label, value, onChange }: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        data-testid="settings-field-label"
        className={labelClass}
      >
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        placeholder="0"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={bigInputClass}
      />
    </div>
  );
}
