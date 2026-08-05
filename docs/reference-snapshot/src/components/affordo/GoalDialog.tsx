import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAffordo } from "@/lib/affordo-context";
import type { Goal } from "@/lib/affordo-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Goal | null;
  onSave: (goal: Goal) => void;
};

export function GoalDialog({ open, onOpenChange, initial, onSave }: Props) {
  const { t } = useAffordo();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setPrice(initial?.price ? String(initial.price) : "");
      setNote(initial?.note ?? "");
    }
  }, [open, initial]);

  const valid = name.trim().length > 0 && parseFloat(price) > 0;

  function submit() {
    if (!valid) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim().slice(0, 80),
      price: parseFloat(price),
      note: note.trim().slice(0, 200),
      createdAt: initial?.createdAt ?? Date.now(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-2 border-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl uppercase tracking-tight">
            {initial ? t("editGoal") : t("addGoal")}
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-widest">
            {t("brand")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="g-name" className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("goalName")}
            </Label>
            <Input
              id="g-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
              placeholder="MacBook Pro"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-price" className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("goalPrice")}
            </Label>
            <Input
              id="g-price"
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-note" className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("goalNote")}
            </Label>
            <Textarea
              id="g-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-mono text-[10px] font-bold uppercase tracking-widest"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!valid}
              className="rounded-none bg-foreground font-mono text-[10px] font-bold uppercase tracking-widest text-background hover:bg-accent hover:text-accent-foreground"
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
