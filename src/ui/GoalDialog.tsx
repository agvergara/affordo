import { useState } from "react";

export interface GoalDialogProps {
  open: boolean;
}

/** The reference's mono uppercase field label (dossier §5). */
const LABEL = "font-mono text-[11px] uppercase tracking-widest text-muted-foreground";

/** Shared input/textarea chrome, in the reference's hairline-underline style. */
const FIELD =
  "w-full border-b border-border bg-transparent py-2 text-base transition-colors focus-visible:border-accent focus-visible:outline-none";

/**
 * The Add goal dialog (docs/affordo-context.md §5 `GoalDialog.tsx`).
 *
 * The reference builds this on Radix's `Dialog`; Affordo keeps React as its only
 * runtime dependency (ADR 0014), so the same rendered semantics are hand-rolled
 * — `role="dialog"` + `aria-modal`, an `<h2>` title, and the `Affordo` mono
 * eyebrow the reference renders as `DialogDescription`.
 */
export function GoalDialog({ open }: GoalDialogProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");

  if (!open) return null;

  // The reference's own validity rule, kept verbatim (dossier §5): a trimmed
  // non-empty name and a price that `parseFloat`s above zero. The naive parse is
  // deliberate — it is what the reference does.
  const valid = name.trim().length > 0 && parseFloat(price) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-dialog-title"
        className="w-full rounded-none border-2 border-foreground bg-background p-6 sm:max-w-md"
      >
        <h2
          id="goal-dialog-title"
          className="font-display text-3xl uppercase tracking-tight"
        >
          Add goal
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Affordo
        </p>

        <form className="mt-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="g-name" className={LABEL}>
              Name
            </label>
            <input
              id="g-name"
              maxLength={80}
              autoFocus
              placeholder="MacBook Pro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="g-price" className={LABEL}>
              Price
            </label>
            <input
              id="g-price"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={FIELD}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="g-note" className={LABEL}>
              Note (optional)
            </label>
            <textarea
              id="g-note"
              maxLength={200}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={FIELD}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest hover:text-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="rounded-none bg-foreground px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
