"use client";

import { ArrowLeft, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { hostname } from "@/lib/utils";
import type { SavedListKind } from "@/lib/zod-schemas";
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
  // Azienda di cui mostrare la mappa — null = dialog chiuso.
  const [mapTarget, setMapTarget] = useState<{
    name: string;
    address: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  const baseColCount = kind === "company" ? 7 : 5;
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
                  <Th>{texts.colComune}</Th>
                  <Th>{texts.colProvince}</Th>
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
                  <Td title={it.comune}>{it.comune}</Td>
                  <Td
                    className="text-muted-foreground"
                    title={it.province ?? undefined}
                  >
                    {it.province}
                  </Td>
                  <Td title={it.address}>
                    <button
                      type="button"
                      onClick={() =>
                        setMapTarget({ name: it.name, address: it.address })
                      }
                      className="text-primary flex w-full items-center gap-1 hover:underline"
                    >
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">{it.address}</span>
                    </button>
                  </Td>
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
      <AddressMapDialog target={mapTarget} onClose={() => setMapTarget(null)} />
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
            label={col.label}
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
          label={texts.notesColumn}
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

// Cella → Dialog con textarea: la cella resta un'anteprima troncata, il
// click apre l'editor comodo per testi lunghi (note, colonne custom).
// Cmd/Ctrl+Enter salva, Esc chiude senza committare.
function EditableCell({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setOpen(false);
    if (draft.trim() !== value) onCommit(draft.trim());
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setOpen(true);
        }}
        className="hover:bg-muted/60 block w-full cursor-text truncate rounded px-2 py-1 text-left"
        title={value}
      >
        {value || "—"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
            }}
            className="max-h-96 min-h-36"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {texts.cancelAction}
            </Button>
            <Button onClick={commit}>{texts.saveConfirmAction}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Click sull'indirizzo → embed Google Maps nel dialog. `output=embed` è
// l'endpoint non ufficiale: niente API key, Google risolve l'indirizzo.
function AddressMapDialog({
  target,
  onClose,
}: {
  target: { name: string; address: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{target?.name}</DialogTitle>
          <DialogDescription>{target?.address}</DialogDescription>
        </DialogHeader>
        {target && (
          <iframe
            title={target.address}
            src={`https://www.google.com/maps?q=${encodeURIComponent(target.address)}&output=embed`}
            className="h-[60vh] w-full rounded-md border"
            loading="lazy"
          />
        )}
      </DialogContent>
    </Dialog>
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
