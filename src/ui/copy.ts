/**
 * User-visible copy that more than one screen has to render identically.
 *
 * The reference keeps every string in one dictionary
 * (`docs/reference-snapshot/src/lib/i18n.ts`); this port inlines them at their
 * single use site, which is simpler and has been fine while each string had
 * exactly one home. `thresholdHint` stopped being that when the goal card
 * started explaining the threshold too (#185), so it lives here rather than
 * being copied — two surfaces quoting the same sentence is precisely how the
 * two drift apart.
 *
 * This is not a general i18n layer and should not grow into one. A string
 * belongs here when a SECOND surface needs it verbatim, not before.
 */

/**
 * What the Significance Threshold does, in the reference's own words
 * (`i18n.ts:30` `thresholdHint`), character for character.
 *
 * Rendered by the onboarding wizard's threshold field and by the goal card's
 * disclosure. Deliberately NOT rendered on `/settings`: that route shows labels
 * and controls only, and `SettingsScreen.test.tsx` asserts all four wizard
 * hints stay off it (#137).
 */
export const THRESHOLD_HINT =
  "Purchases above this % of your monthly income are flagged.";
