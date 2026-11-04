"use client";

import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import {
  addSavedColumn,
  deleteSavedItem,
  deleteSavedList,
  renameSavedList,
  updateSavedItem,
} from "@/lib/actions";
import type {
  SavedCompanyRow,
  SavedJobOfferRow,
  SavedListRow,
} from "@/lib/db/queries";
import type { SavedListKind } from "@/lib/schemas";
import { hostname } from "@/lib/utils";
import { texts } from "@/texts";

type ListDetailProps =
  | { list: SavedListRow; kind: "company"; items: SavedCompanyRow[] }
  | { list: SavedListRow; kind: "job"; items: SavedJobOfferRow[] };

export function ListDetail(props: ListDetailProps) {
  const { list, kind } = props;
  const router = useRouter();
  const [colOpen, setColOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [, startTransition] = useTransition();

  const baseColCount = kind === "company" ? 5 : 5;
  const totalCols = baseColCount + list.columns.length + 2;

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
      <Link
        href="/saved"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        {texts.backToSaved}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading truncate text-xl font-semibold">
          {list.name}
        </h1>
        <Badge variant="secondary">
          {props.items.length} {texts.savedItemsSuffix}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setColOpen(true)}>
            <Plus />
            {texts.addColumnAction}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setRenameOpen(true)}
            aria-label={texts.renameListAction}
          >
            <Pencil />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDeleteOpen(true)}
            aria-label={texts.deleteListAction}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="bg-card overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-[10px] font-medium tracking-[0.08em] uppercase">
              {kind === "company" ? (
                <>
                  <Th>{texts.colName}</Th>
                  <Th>{texts.colType}</Th>
                  <Th>{texts.colAddress}</Th>
                  <Th>{texts.colPhone}</Th>
                  <Th>{texts.colWebsite}</Th>
                </>
              ) : (
                <>
                  <Th>{texts.colTitle}</Th>
                  <Th>{texts.colCompany}</Th>
                  <Th>{texts.colLocation}</Th>
                  <Th>{texts.colVia}</Th>
                  <Th>{texts.colApply}</Th>
                </>
              )}
              {list.columns.map((c) => (
                <Th key={c.key}>{c.label}</Th>
              ))}
              <Th>{texts.notesColumn}</Th>
              <th className="w-14" />
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {props.items.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className="text-muted-foreground px-4 py-8 text-center text-sm"
                >
                  {texts.savedListEmpty}
                </td>
              </tr>
            ) : kind === "company" ? (
              props.items.map((it) => (
                <tr key={it.id} className="align-middle">
                  <Td className="font-medium" title={it.name}>
                    {it.name}
                  </Td>
                  <Td className="text-muted-foreground" title={it.type}>
                    {it.type}
                  </Td>
                  <Td title={it.address ?? undefined}>{it.address}</Td>
                  <Td title={it.phone ?? undefined}>
                    {it.phone ? (
                      <a
                        href={`tel:${it.phone.replace(/[^+\d]/g, "")}`}
                        className="hover:underline"
                      >
                        {it.phone}
                      </a>
                    ) : null}
                  </Td>
                  <Td title={it.website ?? undefined}>
                    {it.website ? (
                      <a
                        href={
                          it.website.startsWith("http")
                            ? it.website
                            : `https://${it.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {hostname(it.website)}
                      </a>
                    ) : null}
                  </Td>
                  <EditableCells
                    item={it}
                    kind={kind}
                    list={list}
                    onMutate={mutate}
                  />
                </tr>
              ))
            ) : (
              props.items.map((it) => (
                <tr key={it.id} className="align-middle">
                  <Td className="font-medium" title={it.title}>
                    {it.title}
                  </Td>
                  <Td title={it.companyName}>{it.companyName}</Td>
                  <Td title={it.location}>{it.location}</Td>
                  <Td className="text-muted-foreground" title={it.via}>
                    {it.via}
                  </Td>
                  <Td>
                    <a
                      href={it.applyLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {texts.openAction}
                    </a>
                  </Td>
                  <EditableCells
                    item={it}
                    kind={kind}
                    list={list}
                    onMutate={mutate}
                  />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PromptDialog
        open={colOpen}
        onOpenChange={setColOpen}
        title={texts.addColumnAction}
        placeholder={texts.columnNamePlaceholder}
        submitLabel={texts.addAction}
        onSubmit={(v) => mutate(addSavedColumn({ listId: list.id, label: v }))}
      />
      <PromptDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={texts.renameListAction}
        initialValue={list.name}
        submitLabel={texts.saveConfirmAction}
        onSubmit={(v) => mutate(renameSavedList({ listId: list.id, name: v }))}
      />
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{texts.deleteListTitle}</DialogTitle>
            <DialogDescription>{texts.deleteListDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {texts.cancelAction}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                startTransition(async () => {
                  try {
                    await deleteSavedList({ listId: list.id });
                    router.push("/saved");
                  } catch {
                    toast.error(texts.editError);
                  }
                });
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

// Celle di coda condivise tra i due kind: colonne custom + note + delete.
function EditableCells({
  item,
  kind,
  list,
  onMutate,
}: {
  item: SavedCompanyRow | SavedJobOfferRow;
  kind: SavedListKind;
  list: SavedListRow;
  onMutate: (action: Promise<unknown>) => void;
}) {
  return (
    <>
      {list.columns.map((col) => (
        <td key={col.key} className="max-w-56 px-1 py-1">
          <EditableCell
            value={item.extra[col.key] ?? ""}
            onCommit={(v) =>
              onMutate(
                updateSavedItem({
                  kind,
                  itemId: item.id,
                  extra: { ...item.extra, [col.key]: v },
                }),
              )
            }
          />
        </td>
      ))}
      <td className="max-w-72 px-1 py-1">
        <EditableCell
          value={item.notes ?? ""}
          onCommit={(v) =>
            onMutate(
              updateSavedItem({ kind, itemId: item.id, notes: v || null }),
            )
          }
        />
      </td>
      <td className="px-2 py-1">
        <DeleteItemButton
          onDelete={() => onMutate(deleteSavedItem({ kind, itemId: item.id }))}
        />
      </td>
    </>
  );
}

// Cella editabile stile foglio: click → input, Enter/blur committa, Esc annulla.
function EditableCell({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="hover:bg-muted/60 block w-full cursor-text truncate rounded px-2 py-1 text-left"
        title={value}
      >
        {value || "—"}
      </button>
    );
  }
  return (
    <Input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) onCommit(draft.trim());
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="h-7 px-2 py-1"
    />
  );
}

// Delete a due step: primo click arma la conferma (3s), secondo esegue.
function DeleteItemButton({ onDelete }: { onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);

  return confirm ? (
    <Button size="sm" variant="destructive" onClick={onDelete}>
      {texts.confirmLabel}
    </Button>
  ) : (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => setConfirm(true)}
      aria-label={texts.deleteAction}
    >
      <Trash2 />
    </Button>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-3 py-2 font-medium whitespace-nowrap">{children}</th>
  );
}

function Td({
  children,
  className = "",
  title,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={`max-w-56 truncate px-3 py-2 ${className}`} title={title}>
      {children}
    </td>
  );
}
