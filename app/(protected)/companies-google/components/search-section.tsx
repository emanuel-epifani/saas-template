"use client";

import { cn } from "cn";
import { Globe, LoaderCircle, MapPin, Phone } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { SaveDialog } from "@/components/save-dialog";
import { SelectionBar } from "@/components/selection-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { findCompaniesPlaces } from "@/lib/actions";
import type { PlacesCompanyResult } from "@/lib/google-places";
import { hostname } from "@/lib/utils";
import { texts } from "@/texts";

import { ComuniCombobox } from "./comuni-combobox";

const PlacesMap = dynamic(() => import("./places-map"), { ssr: false });

const cell =
  "border-border flex-1 border-b px-3.5 pt-2 pb-2 transition-colors focus-within:bg-accent/50 sm:border-r sm:border-b-0";
const cellText = `${cell} cursor-text`;
const cellLabel =
  "text-muted-foreground block text-[10px] font-medium tracking-[0.08em] uppercase";
const field =
  "h-8 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0 placeholder:font-normal placeholder:text-muted-foreground/70";

function chipClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground border-primary"
      : "border-border text-muted-foreground hover:bg-accent",
  );
}

export function SearchSection() {
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("term") ?? "torneria");
  const [comuni, setComuni] = useState<string[]>(
    searchParams.get("comuni")?.split(",").filter(Boolean) ?? [
      "COLLEGNO",
      "RIVOLI",
      "GRUGLIASCO",
    ],
  );
  const [results, setResults] = useState<PlacesCompanyResult[]>([]);
  const [truncatedComuni, setTruncatedComuni] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<ReadonlySet<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [saveOpen, setSaveOpen] = useState(false);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const perComune = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const r of results) {
      acc[r.comune] = (acc[r.comune] ?? 0) + 1;
    }
    return acc;
  }, [results]);

  const comuniList = useMemo(
    () => Object.entries(perComune).sort((a, b) => b[1] - a[1]),
    [perComune],
  );

  const truncatedSet = useMemo(
    () => new Set(truncatedComuni),
    [truncatedComuni],
  );

  const visible = useMemo(
    () =>
      filter.size === 0
        ? results
        : results.filter((r) => filter.has(r.comune)),
    [results, filter],
  );

  const highlightedIndex = hoveredIndex ?? selectedIndex;
  const searchKey = `${term}|${comuni.join(",")}|${[...filter].sort().join(",")}`;

  function run() {
    if (comuni.length === 0) {
      toast.error(texts.comuniRequired);
      return;
    }
    startTransition(async () => {
      try {
        const data = await findCompaniesPlaces({ term, comuni, maxPages: 3 });
        setResults(data.companies);
        setTruncatedComuni(data.truncatedComuni);
        setSearched(true);
        setFilter(new Set());
        setSelectedIndex(null);
        setHoveredIndex(null);
        setChecked(new Set());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : texts.searchError);
      }
    });
  }

  function toggleFilter(name: string) {
    setFilter((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setSelectedIndex(null);
    setHoveredIndex(null);
  }

  function clearFilter() {
    setFilter(new Set());
    setSelectedIndex(null);
    setHoveredIndex(null);
  }

  function select(index: number) {
    setSelectedIndex(index === selectedIndex ? null : index);
    cardRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  function toggleChecked(id: string, on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Seleziona/toglie solo i risultati VISIBILI: i check fuori dal filtro
  // corrente restano, così cambiare chip non perde la selezione.
  function toggleAll(on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const c of visible) {
        if (on) next.add(c.externalId);
        else next.delete(c.externalId);
      }
      return next;
    });
  }

  const defaultListName = `${term} ${comuni.join(", ")}`.slice(0, 80).trim();

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="bg-card border-border flex flex-col rounded-lg border sm:flex-row sm:items-stretch"
      >
        <label htmlFor="places-term" className={cellText}>
          <span className={cellLabel}>{texts.companiesTermLabel}</span>
          <Input
            id="places-term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={texts.companiesTermPlaceholder}
            required
            className={field}
          />
        </label>
        <div className={cell}>
          <span className={cellLabel}>{texts.placesComuniLabel}</span>
          <ComuniCombobox
            id="places-comuni"
            value={comuni}
            onChange={setComuni}
            inputClassName={field}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={pending || comuni.length === 0}
          className="min-h-12 rounded-none rounded-b-lg px-6 sm:h-auto sm:min-h-0 sm:rounded-b-none sm:rounded-r-lg"
        >
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          {pending ? texts.searching : texts.searchAction}
        </Button>
      </form>

      {searched && results.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={clearFilter}
              className={chipClass(filter.size === 0)}
            >
              {texts.placesFilterAll} {results.length}
              {truncatedComuni.length > 0 ? "+" : null}
            </button>
            {comuniList.map(([name, count]) => {
              const truncated = truncatedSet.has(name.toUpperCase());
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleFilter(name)}
                  className={chipClass(filter.has(name))}
                  title={truncated ? texts.placesTruncatedHint : undefined}
                >
                  {name} {count}
                  {truncated ? "+" : null}
                </button>
              );
            })}
          </div>
          {truncatedComuni.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              {texts.placesTruncatedHint}
            </p>
          ) : null}
        </div>
      ) : null}

      {searched && results.length === 0 && !pending ? (
        <p className="text-muted-foreground text-sm">
          {texts.searchNoResultsDesc}
        </p>
      ) : null}

      {searched && results.length > 0 ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className="flex h-[70vh] flex-col gap-3">
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              {pending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : null}
              {visible.length} {texts.placesTotalLabel}
            </p>
            <div
              className={cn(
                "bg-card border-border relative flex min-h-0 flex-1 flex-col rounded-md border transition-opacity",
                pending && "opacity-60",
              )}
            >
              <div className="scroll-list min-h-0 flex-1 overflow-y-auto">
                <div className="bg-card text-muted-foreground border-border sticky top-0 z-20 flex h-9 items-stretch border-b text-[10px] font-medium tracking-[0.08em] uppercase">
                  <span className="border-border flex w-10 items-center justify-center border-r">
                    {texts.registerIndexLabel}
                  </span>
                  <span className="flex flex-1 items-center gap-3 px-4 py-1.5">
                    {texts.navCompanies}
                    <span className="ml-auto normal-case">
                      {texts.selectToSaveHint}
                    </span>
                  </span>
                  <span className="flex w-10 items-center justify-center">
                    <Checkbox
                      checked={
                        visible.length > 0 &&
                        visible.every((c) => checked.has(c.externalId))
                      }
                      onCheckedChange={(v) => toggleAll(v === true)}
                      aria-label={texts.selectAllAction}
                    />
                  </span>
                </div>
                <ul
                  className={cn(
                    "divide-border divide-y",
                    checked.size > 0 && "pb-14",
                  )}
                >
                  {visible.map((c, i) => (
                    <li
                      key={c.externalId}
                      className="scroll-mt-9"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <div
                        className={cn(
                          "relative flex h-[120px] text-sm transition-colors",
                          i === highlightedIndex
                            ? "bg-accent/60"
                            : "hover:bg-muted/50",
                          checked.has(c.externalId) && "bg-primary/5",
                        )}
                      >
                        <span
                          className={cn(
                            "border-border flex w-10 shrink-0 items-center justify-center border-r font-mono text-xs font-medium tabular-nums",
                            i === highlightedIndex
                              ? "bg-primary/10 text-primary"
                              : "bg-muted/40 text-muted-foreground",
                          )}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1 px-4 py-3">
                          <button
                            ref={(el) => {
                              cardRefs.current[i] = el;
                            }}
                            type="button"
                            onClick={() => select(i)}
                            onFocus={() => setHoveredIndex(i)}
                            onBlur={() => setHoveredIndex(null)}
                            className="block w-full cursor-pointer truncate text-left leading-6 font-medium after:absolute after:inset-0"
                          >
                            {c.name}
                          </button>
                          <div className="text-muted-foreground mt-1 flex h-6 items-center gap-2 text-[13px]">
                            <MapPin className="size-3.5 shrink-0" />
                            <span className="min-w-0 truncate" title={c.address}>
                              {c.address}
                            </span>
                          </div>
                          <div className="text-muted-foreground flex h-6 items-center gap-2 text-[13px] tabular-nums">
                            {c.phone ? (
                              <a
                                href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-foreground relative z-10 flex min-w-0 items-center gap-2 hover:underline"
                                title={c.phone}
                              >
                                <Phone className="size-3.5 shrink-0" />
                                <span className="truncate">{c.phone}</span>
                              </a>
                            ) : null}
                          </div>
                          <div className="text-muted-foreground flex h-6 items-center gap-2 text-[13px]">
                            {c.website ? (
                              <a
                                href={
                                  c.website.startsWith("http")
                                    ? c.website
                                    : `https://${c.website}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary relative z-10 flex min-w-0 items-center gap-2 hover:underline"
                                title={c.website}
                              >
                                <Globe className="size-3.5 shrink-0" />
                                <span className="truncate">
                                  {hostname(c.website)}
                                </span>
                              </a>
                            ) : null}
                          </div>
                        </div>
                        <span className="relative z-10 flex w-10 shrink-0 items-center justify-center">
                          <Checkbox
                            checked={checked.has(c.externalId)}
                            onCheckedChange={(v) =>
                              toggleChecked(c.externalId, v === true)
                            }
                            aria-label={`${texts.selCheckboxLabel} ${c.name}`}
                          />
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <SelectionBar
                count={checked.size}
                onClear={() => toggleAll(false)}
                onSave={() => setSaveOpen(true)}
              />
            </div>
          </div>

          <div className="border-border relative sticky top-4 h-[70vh] self-start overflow-hidden rounded-md border">
            <PlacesMap
              companies={visible}
              searchKey={searchKey}
              highlightedIndex={highlightedIndex}
              selectedIndex={selectedIndex}
              hoveredIndex={hoveredIndex}
              onSelect={select}
              onHover={setHoveredIndex}
            />
          </div>
        </div>
      ) : null}

      <SaveDialog
        kind="company"
        items={results.filter((c) => checked.has(c.externalId))}
        defaultName={defaultListName}
        open={saveOpen}
        onOpenChange={setSaveOpen}
        onSaved={() => setChecked(new Set())}
      />
    </div>
  );
}
