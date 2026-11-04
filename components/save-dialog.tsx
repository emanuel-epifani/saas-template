"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMyLists, saveToList } from "@/lib/saved/actions";
import type { SavedListWithCount } from "@/lib/saved/repo";
import type { SavedCompanyItem, SavedJobItem } from "@/lib/saved/schemas";
import { texts } from "@/texts";

const NEW_LIST = "__new__";

type SaveDialogProps = {
  defaultName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chiamato dopo un salvataggio riuscito (es. azzera la selezione). */
  onSaved: () => void;
} & (
  | { kind: "company"; items: SavedCompanyItem[] }
  | { kind: "job"; items: SavedJobItem[] }
);

export function SaveDialog(props: SaveDialogProps) {
  const { defaultName, open, onOpenChange, onSaved } = props;
  const [lists, setLists] = useState<SavedListWithCount[] | null>(null);
  const [target, setTarget] = useState(NEW_LIST);
  const [name, setName] = useState(defaultName);
  const [pending, startTransition] = useTransition();

  // Le liste del kind giusto si caricano ad apertura — una action, niente SSR.
  useEffect(() => {
    if (!open) return;
    setLists(null);
    setTarget(NEW_LIST);
    setName(defaultName);
    getMyLists({ kind: props.kind })
      .then(setLists)
      .catch(() => setLists([]));
  }, [open, props.kind, defaultName]);

  function save() {
    const base =
      target === NEW_LIST ? { listName: name.trim() } : { listId: target };
    const input =
      props.kind === "company"
        ? { kind: "company" as const, ...base, items: props.items }
        : { kind: "job" as const, ...base, items: props.items };
    startTransition(async () => {
      try {
        const res = await saveToList(input);
        const skipped = res.total - res.inserted;
        toast.success(
          `${res.inserted} ${texts.savedSuffix}` +
            (skipped > 0 ? ` (${skipped} ${texts.alreadySavedSuffix})` : ""),
        );
        onSaved();
        onOpenChange(false);
      } catch {
        toast.error(texts.saveError);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{texts.saveDialogTitle}</DialogTitle>
          <DialogDescription>
            {props.items.length} {texts.saveDialogItemsSuffix}
          </DialogDescription>
        </DialogHeader>

        {lists === null ? (
          <div className="bg-muted h-9 animate-pulse rounded-md" />
        ) : lists.length > 0 ? (
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NEW_LIST}>
                {texts.saveDialogNewList}
              </SelectItem>
              {lists.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name} · {l.itemCount}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {target === NEW_LIST ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={texts.saveDialogListName}
            autoFocus={lists !== null && lists.length === 0}
          />
        ) : null}

        <DialogFooter>
          <Button
            onClick={save}
            disabled={
              pending ||
              props.items.length === 0 ||
              (target === NEW_LIST && !name.trim())
            }
          >
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            {texts.saveConfirmAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
