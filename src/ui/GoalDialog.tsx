import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Goal } from "../state/goals-store";

export interface GoalDialogProps {
  open: boolean;
  /** Called with `false` when the dialog asks to close (Cancel, Escape, save). */
  onOpenChange: (open: boolean) => void;
  /** Called with the built Goal when a valid form is submitted. */
  onSave: (goal: Goal) => void;
}

/** Tabbable controls inside the dialog panel, in document order. */
function focusableWithin(panel: HTMLElement | null): HTMLElement[] {
  if (panel === null) return [];
  const candidates = panel.querySelectorAll<HTMLElement>(
    "button, input, textarea, select, a[href], [tabindex]:not([tabindex='-1'])",
  );
  return Array.from(candidates).filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
  );
}

/** The reference's mono uppercase field label (dossier §5). */
const LABEL =
  "font-mono text-[11px] uppercase tracking-widest text-muted-foreground";

/**
 * The dialog's fields are shadcn `Input`/`Textarea` primitives in the reference,
 * not the "big audit" underline inputs the wizard and settings use (dossier §5,
 * §11): a bordered box with a one-pixel accent focus ring.
 */
const INPUT =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

const TEXTAREA =
  "min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

/**
 * The Add goal dialog (docs/affordo-context.md §5 `GoalDialog.tsx`).
 *
 * The reference builds this on Radix's `Dialog`; Affordo keeps React as its only
 * runtime dependency (ADR 0014), so the same semantics are hand-rolled — the
 * `role="dialog"` + `aria-modal` panel, the `<h2>` title, the `Affordo` mono
 * eyebrow the reference renders as `DialogDescription`, the `sr-only` Close
 * control, Escape-to-dismiss, and the Tab focus trap (dossier §5, §6, §11).
 *
 * This slice is **create only** (issue #64). Editing an existing goal — the
 * reference's `initial` prop, the `Edit goal` title, and the preserved
 * `id`/`createdAt` — lands with issue #65, along with removal.
 */
export function GoalDialog({ open, onOpenChange, onSave }: GoalDialogProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  // The reference resets the fields on open (dossier §5). The dialog stays
  // mounted between openings, so the reset has to be explicit — without it a
  // cancelled or saved entry would still be sitting there next time.
  useEffect(() => {
    if (!open) return;
    setName("");
    setPrice("");
    setNote("");
  }, [open]);

  // Escape dismisses the dialog and Tab cycles within it — the two keyboard
  // behaviours Radix's Dialog gives the reference (dossier §11). Bound on the
  // document rather than the dialog node so they fire wherever focus sits.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableWithin(panel.current);
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (first === undefined || last === undefined) return;
      const active = document.activeElement;
      const inside = panel.current?.contains(active) ?? false;
      // Wrap at whichever end the user is walking off.
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  // The reference's own validity rule, kept verbatim (dossier §5): a trimmed
  // non-empty name and a price that `parseFloat`s above zero. The naive parse is
  // deliberate — it is what the reference does.
  const valid = name.trim().length > 0 && parseFloat(price) > 0;

  // Submitting the form is the single save path, so Enter in any field and a
  // click on Save do exactly the same thing (dossier §5). The caps are applied
  // again here, not just by `maxLength`, because the reference does both.
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onSave({
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 80),
      price: parseFloat(price),
      note: note.trim().slice(0, 200),
      createdAt: Date.now(),
    });
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-dialog-title"
        className="relative w-full rounded-none border-2 border-foreground bg-background p-6 sm:max-w-md"
      >
        {/* Radix's built-in dismiss: an X glyph carrying an `sr-only` "Close"
            label (dossier §6). */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 opacity-70 transition-opacity hover:opacity-100"
        >
          <span aria-hidden="true">✕</span>
          <span className="sr-only">Close</span>
        </button>

        <h2
          id="goal-dialog-title"
          className="font-display text-3xl uppercase tracking-tight"
        >
          Add goal
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Affordo
        </p>

        <form onSubmit={submit} className="mt-6 space-y-5">
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
              className={INPUT}
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
              className={INPUT}
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
              className={TEXTAREA}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
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
