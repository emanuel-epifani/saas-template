"use client";

import { cn } from "cn";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ATECO_DIVISIONS, ATECO_LEAVES } from "@/lib/companies/ateco";
import { texts } from "@/texts";

// Albero: divisione → (riga "tutta la categoria" + foglie a 6 cifre).
// I livelli intermedi restano nel dataset ma non in UI: il salto
// divisione→foglia è quello che serve a un utente business.
interface TreeDivision {
  code: string;
  label: string;
  leaves: readonly (readonly [string, string])[];
}

const TREE: readonly TreeDivision[] = ATECO_DIVISIONS.map(([code, label]) => ({
  code,
  label,
  leaves: ATECO_LEAVES.filter(([c]) => c.startsWith(code)),
}));

// value (codice inviato all'API) → label mostrata sul trigger.
const LABEL = new Map<string, string>();
for (const [c, l] of ATECO_DIVISIONS) LABEL.set(c, `${c} ${l}`);
for (const [c, l] of ATECO_LEAVES) LABEL.set(c, `${c} ${l}`);

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

interface Hit {
  code: string;
  label: string;
  sub: string;
}

// Search mode: lista piatta (divisioni + foglie) filtrata per label/codice.
function searchTree(q: string): Hit[] {
  const n = norm(q.trim());
  if (!n) return [];
  const hits: Hit[] = [];
  for (const [c, l] of ATECO_DIVISIONS) {
    if (norm(l).includes(n) || c.startsWith(n))
      hits.push({
        code: c,
        label: `${c} ${l}`,
        sub: texts.openapiAtecoAllLabel,
      });
  }
  for (const [c, l] of ATECO_LEAVES) {
    if (norm(l).includes(n) || c.replace(/\./g, "").startsWith(n))
      hits.push({ code: c, label: `${c} ${l}`, sub: c.slice(0, 2) });
  }
  return hits.slice(0, 60);
}

interface AtecoPickerProps {
  /** Codice ATECO selezionato ("" = nessuna). */
  value: string;
  onPick: (code: string) => void;
  className?: string;
}

export function AtecoPicker({ value, onPick, className }: AtecoPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /** Una sola divisione espansa alla volta (accordion). */
  const [expanded, setExpanded] = useState<string | null>(null);
  const hits = useMemo(() => searchTree(query), [query]);
  const searching = query.trim().length > 0;
  const label = value ? LABEL.get(value) : undefined;

  function choose(code: string) {
    onPick(code);
    setOpen(false);
    setQuery("");
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            className,
            "flex min-w-0 flex-1 items-center justify-between gap-2 text-left",
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              !label && "text-muted-foreground/70 font-normal",
            )}
          >
            {label ?? texts.openapiAtecoPlaceholder}
          </span>
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onPick("")}
            aria-label={texts.openapiAtecoClear}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[80vh] flex-col gap-3 overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{texts.openapiAtecoPickTitle}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={texts.openapiAtecoSearchPlaceholder}
              className="pl-8"
            />
          </div>
          <div className="border-border -mx-1 min-h-0 flex-1 overflow-y-auto rounded-sm border">
            {searching ? (
              hits.length > 0 ? (
                hits.map((h) => (
                  <button
                    key={h.code}
                    type="button"
                    onClick={() => choose(h.code)}
                    className="hover:bg-accent flex w-full items-baseline gap-2 border-b border-transparent px-3 py-2 text-left text-sm last:border-b-0"
                  >
                    <span className="min-w-0 flex-1 truncate">{h.label}</span>
                    <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                      {h.sub}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                  {texts.openapiAtecoNoResults}
                </p>
              )
            ) : (
              TREE.map((node) => (
                <div
                  key={node.code}
                  className="border-border border-b last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(expanded === node.code ? null : node.code)
                    }
                    className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left"
                  >
                    <ChevronRight
                      className={cn(
                        "text-muted-foreground size-3.5 shrink-0 transition-transform",
                        expanded === node.code && "rotate-90",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {node.label}
                    </span>
                    <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                      {node.code}
                    </span>
                  </button>
                  {expanded === node.code ? (
                    <div className="border-border bg-muted/40 border-t">
                      {/* Prima riga = seleziona la divisione intera */}
                      <button
                        type="button"
                        onClick={() => choose(node.code)}
                        className="hover:bg-accent flex w-full items-baseline gap-2 px-3 py-2 pl-9 text-left text-sm font-medium"
                      >
                        <span className="min-w-0 flex-1">
                          {texts.openapiAtecoAllLabel}
                        </span>
                        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                          {node.code}
                        </span>
                      </button>
                      {node.leaves.map(([code, l]) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => choose(code)}
                          className="hover:bg-accent flex w-full items-baseline gap-2 px-3 py-2 pl-9 text-left text-sm"
                        >
                          <span className="text-muted-foreground min-w-0 flex-1 truncate">
                            {l}
                          </span>
                          <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                            {code}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
