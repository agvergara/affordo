import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Goal } from "../state/goals-store";

interface GoalDialogProps {
  open: boolean;
  /** Called with `false` when the dialog asks to close (Cancel, Escape, save). */
  onOpenChange: (open: boolean) => void;
  /**
   * The Goal being revised, or null/absent to add a new one. Its presence is
   * what makes this the `Edit goal` dialog rather than the `Add goal` one.
   */
  initial?: Goal | null;
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

/** The dossier's "Label (form)" typography token (§4, line 297). */
const LABEL =
  "font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

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
 * One dialog serves both jobs (issue #65). Passing `initial` re-titles it to
 * `Edit goal`, seeds the fields from that Goal, and — critically — carries its
 * `id` and `createdAt` back out on save, so revising a goal updates it in place
 * instead of minting a second one.
 */
export function GoalDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: GoalDialogProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  // The reference resets the fields on open, seeding them from `initial`
  // (dossier §5). The dialog stays mounted between openings, so the reset has to
  // be explicit — without it a cancelled or saved entry would still be sitting
  // there next time, and an edit would leak into the next Add.
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    // A price of 0 is a legitimate stored value, so this cannot lean on `??`
    // over `initial.price` — it branches on whether there is an `initial` at all.
    setPrice(initial ? String(initial.price) : "");
    setNote(initial?.note ?? "");
  }, [open, initial]);

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
      // Focus can sit outside the panel — clicking the title or any other
      // non-focusable part of the dialog drops it to the body — so both
      // directions have to pull it back, not just Shift+Tab.
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
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
    // An edit carries the original `id` and `createdAt` straight back out: the
    // goal is revised, not replaced, so it keeps its identity and its stamped
    // creation date (dossier §5, PRD story 51). Only a new goal mints them.
    //
    // `...initial` first, and it is load-bearing. This dialog owns three fields;
    // it does not own the whole Goal. Rebuilding the record from a literal of
    // only the fields it knows silently destroyed every other one — #155 added
    // `share` and editing an assigned goal from /goals wiped it, with nothing
    // failing. Spreading the original means a field this dialog has never heard
    // of survives an edit, which is the property that was actually missing.
    onSave({
      ...(initial ?? {}),
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim().slice(0, 80),
      price: parseFloat(price),
      note: note.trim().slice(0, 200),
      createdAt: initial?.createdAt ?? Date.now(),
    });
    onOpenChange(false);
  };

  return (
    // Radix closes on a press outside the content; the reference does not
    // override that, so pressing the overlay dismisses (dossier §9).
    <div
      data-testid="goal-dialog-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
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
          /*
           * 24x24 hit area (ADR 0022), with the glyph landing exactly where the
           * reference centres its own.
           *
           * The reference wraps a 16x16 `<X>` with no padding at `right-4
           * top-4`, so its glyph centre sits 24px from each edge — and its
           * button is 16x16, itself under the floor. Ours was 12x24. A 24x24
           * box at `right-3 top-3` centres at 24px from each edge too: same
           * glyph position as the reference, bigger target than either.
           */
          className="absolute right-3 top-3 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm opacity-70 transition-opacity hover:opacity-100"
        >
          <span aria-hidden="true">✕</span>
          <span className="sr-only">Close</span>
        </button>

        <h2
          id="goal-dialog-title"
          className="font-display text-3xl uppercase tracking-tight"
        >
          {initial ? "Edit goal" : "Add goal"}
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
              className="cursor-pointer px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="cursor-pointer rounded-none bg-foreground px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-background transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
