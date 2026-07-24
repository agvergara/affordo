import { parseAmount, type ParsedAmount } from "../engine";

/** True only when a field holds non-empty input that could not be parsed. */
function isUnparseable(parsed: ParsedAmount): boolean {
  return !parsed.ok && parsed.reason === "invalid";
}

export interface MoneyFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** data-testid for the inline hint shown when the input can't be parsed. */
  errorTestId: string;
}

/**
 * A labelled amount input that owns the parse-and-hint pattern shared by every
 * money field: a blank field is silent, a non-empty unparseable one shows an
 * inline hint. Presentational — it parses only to decide the hint and hands the
 * raw string back to the owner; the engine stays the single source of truth.
 */
export function MoneyField({
  id,
  label,
  value,
  onChange,
  errorTestId,
}: MoneyFieldProps) {
  const showHint = isUnparseable(parseAmount(value));
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      {showHint && (
        <p data-testid={errorTestId} role="alert">
          Enter an amount like 1.234,56.
        </p>
      )}
    </>
  );
}
