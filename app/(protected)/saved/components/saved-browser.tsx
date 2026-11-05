"use client";

import { Briefcase, Building2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PromptDialog } from "@/components/prompt-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { deleteSavedList, renameSavedList } from "@/lib/actions";
import type { SavedListWithCount } from "@/lib/db/queries";
import type { SavedListKind } from "@/lib/zod-schemas";
import { texts } from "@/texts";

const itemClass =
  "text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs";

const dateFmt = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" });

/** Archivio: segmented control per kind + lista verticale delle liste. */
export function SavedBrowser({ lists }: { lists: SavedListWithCount[] }) {
  const [kind, setKind] = useState<SavedListKind>("company");
  const [renameTarget, setRenameTarget] = useState<SavedListWithCount | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<SavedListWithCount | null>(
    null,
  );
  const [, startTransition] = useTransition();
  const visible = lists.filter((l) => l.kind === kind);
  const KindIcon = kind === "company" ? Building2 : Briefcase;

  function mutate(action: Promise<unknown>) {
    startTransition(async () => {
      try {
        await action;
      } catch {
        toast.error(texts.editError);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        type="single"
        value={kind}
        onValueChange={(v) => {
          if (v === "company" || v === "job") setKind(v);
        }}
        className="bg-muted w-fit rounded-lg p-1"
      >
        <ToggleGroupItem value="company" className={itemClass}>
          <Building2 />
          {texts.savedKindCompanies}
        </ToggleGroupItem>
        <ToggleGroupItem value="job" className={itemClass}>
          <Briefcase />
          {texts.savedKindJobs}
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="bg-card divide-border divide-y rounded-md border">
        {visible.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            {texts.savedEmptyKind}
          </p>
        ) : (
          visible.map((l) => (
            <div
              key={l.id}
              className="hover:bg-muted/50 group flex items-center gap-4 px-4 py-3.5 transition-colors"
            >
              <Link
                href={`/saved/${l.id}`}
                aria-label={l.name}
                className="flex min-w-0 flex-1 items-center gap-4"
              >
                <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-md">
                  <KindIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {l.name}
                </span>
                <Badge variant="secondary" className="shrink-0">
                  {l.itemCount} {texts.savedItemsSuffix}
                </Badge>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {dateFmt.format(l.updatedAt)}
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground"
                  aria-label={`${texts.renameListAction} ${l.name}`}
                  onClick={() => setRenameTarget(l)}
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`${texts.deleteListAction} ${l.name}`}
                  onClick={() => setDeleteTarget(l)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <PromptDialog
        open={renameTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRenameTarget(null);
        }}
        title={texts.renameListAction}
        initialValue={renameTarget?.name ?? ""}
        submitLabel={texts.saveConfirmAction}
        onSubmit={(v) => {
          const target = renameTarget;
          if (target) {
            mutate(renameSavedList({ listId: target.id, name: v }));
          }
        }}
      />
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{texts.deleteListTitle}</DialogTitle>
            <DialogDescription>{texts.deleteListDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {texts.cancelAction}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const target = deleteTarget;
                setDeleteTarget(null);
                if (target) mutate(deleteSavedList({ listId: target.id }));
              }}
            >
              {texts.deleteAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
