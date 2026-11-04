"use client";

import { cn } from "cn";
import { Building2, Globe, LoaderCircle, MapPin, Phone } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { SaveDialog } from "@/components/save-dialog";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { findCompanies } from "@/lib/companies/actions";
import type { CompanyResult } from "@/lib/companies/serpapi";
import { hostname } from "@/lib/utils";
import { texts } from "@/texts";
import { createSearchCache } from "../../lib/search-cache";
import { consumeSearchIntent } from "../../lib/search-intent";
import { companiesSearchHref } from "../lib/search-params";

const CompaniesMap = dynamic(() => import("./companies-map"), { ssr: false });

const PAGE_SIZE = 20;

interface Snapshot {
  results: CompanyResult[];
  hasMore: boolean;
  offset: number;
  resultQuery: { term: string; city: string };
  selectedIndex: number | null;
}

const cache = createSearchCache<Snapshot>();

export function SearchSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("term") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [searched, setSearched] = useState(false);
  const [resultQuery, setResultQuery] = useState<{
    term: string;
    city: string;
  } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [saveOpen, setSaveOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const autoSearched = useRef(false);

  const highlightedIndex = hoveredIndex ?? selectedIndex;
  const status =
    pending && results.length === 0
      ? "loading"
      : !searched
        ? "idle"
        : results.length === 0
          ? "empty"
          : "results";

  function runSearch(params: { term: string; city: string }) {
    setSelectedIndex(null);
    setChecked(new Set());
    startTransition(async () => {
      try {
        const data = await findCompanies({ ...params, start: 0 });
        setResults(data.companies);
        setHasMore(data.hasMore);
        setOffset(0);
        setSearched(true);
        setResultQuery({
          term: params.term,
          city: params.city,
        });
      } catch {
        toast.error(texts.searchError);
      }
    });
  }

  function onSubmit() {
    const params = { term, city };
    router.replace(companiesSearchHref(params), { scroll: false });
    runSearch(params);
  }

  function onLoadMore() {
    // Continue the ACTIVE search (the «…» summary), not the form draft —
    // the draft may have been edited without pressing Cerca.
    if (!resultQuery) return;
    const next = offset + PAGE_SIZE;
    startTransition(async () => {
      try {
        const data = await findCompanies({ ...resultQuery, start: next });
        setResults((prev) => appendUnique(prev, data.companies));
        setHasMore(data.hasMore);
        setOffset(next);
      } catch {
        // Previous results stay on screen — only the append failed.
        toast.error(texts.searchError);
      }
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

  function toggleAll(on: boolean) {
    setChecked(on ? new Set(results.map((c) => c.externalId)) : new Set());
  }

  function select(index: number) {
    // Click on the selected row/pin again deselects — closes the popup.
    setSelectedIndex(index === selectedIndex ? null : index);
    cardRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  // URL-prefill: form values come from the URL, but a search runs only on
  // explicit intent — a fresh navigation marked via markSearchIntent()
  // (dashboard quick search / chips). Reloads, new tabs and shared links
  // have no intent flag, so they only prefill the form: NO paid SerpAPI
  // call. The ref survives StrictMode's double effect. Deps intentionally
  // empty: back/forward navigation does NOT re-search (accepted trade-off).
  // Mount order: explicit intent wins (fresh search, overwrites cache) →
  // else restore the cached snapshot for this exact URL (back/forward,
  // sidebar navigation — zero SerpAPI calls) → else idle. Reload and
  // shared links have neither, so they only prefill the form.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design
  useEffect(() => {
    if (autoSearched.current) return;
    autoSearched.current = true;
    const params = { term, city };
    if (!params.term || !params.city) return;
    const href = companiesSearchHref(params);
    if (consumeSearchIntent(href)) {
      runSearch(params);
      return;
    }
    const snap = cache.restore(href);
    if (!snap) return;
    setResults(snap.results);
    setHasMore(snap.hasMore);
    setOffset(snap.offset);
    setResultQuery(snap.resultQuery);
    setSelectedIndex(snap.selectedIndex);
    setSearched(true);
    if (snap.selectedIndex != null) {
      requestAnimationFrame(() => {
        cardRefs.current[snap.selectedIndex ?? -1]?.scrollIntoView({
          block: "nearest",
        });
      });
    }
  }, []);

  // Keep the cache in sync with the ACTIVE search — every change after a
  // completed search (results, selection, paging) refreshes the snapshot.
  useEffect(() => {
    if (!searched || !resultQuery) return;
    cache.save(companiesSearchHref(resultQuery), {
      results,
      hasMore,
      offset,
      resultQuery,
      selectedIndex,
    });
  }, [searched, results, hasMore, offset, resultQuery, selectedIndex]);

  return (
    <div className="flex flex-col gap-6">
      <SearchBar
        idPrefix="companies"
        term={term}
        onTermChange={setTerm}
        termLabel={texts.companiesTermLabel}
        termPlaceholder={texts.companiesTermPlaceholder}
        city={city}
        onCityChange={setCity}
        pending={pending}
        onSubmit={onSubmit}
      />

      {status === "idle" ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className="flex h-[70vh] flex-col gap-3 p-1">
            <div className="flex items-start gap-3">
              <div className="border-border grid size-10 shrink-0 place-items-center rounded-md border">
                <Building2 className="text-muted-foreground size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-heading text-sm font-medium">
                  {texts.searchIdleTitle}
                </p>
                <p className="text-muted-foreground text-sm">
                  {texts.searchIdleDescCompanies}
                </p>
              </div>
            </div>
            {Array.from({ length: 4 }, (_, i) => (
              <PlaceholderCard key={i} />
            ))}
          </div>
          <div className="border-border sticky top-4 h-[70vh] self-start overflow-hidden rounded-md border">
            <CompaniesMap
              companies={[]}
              searchKey=""
              highlightedIndex={null}
              selectedIndex={null}
              hoveredIndex={null}
              onSelect={() => {}}
              onHover={() => {}}
            />
            <div className="bg-card text-muted-foreground absolute top-3 left-1/2 z-[400] -translate-x-1/2 rounded-md border px-2.5 py-1 text-xs">
              {texts.mapIdleHint}
            </div>
          </div>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className="flex h-[70vh] flex-col gap-2 p-1">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-[120px] shrink-0 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-[70vh] rounded-md" />
        </div>
      ) : null}

      {status === "empty" ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>{texts.searchNoResultsTitle}</EmptyTitle>
            <EmptyDescription>{texts.searchNoResultsDesc}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {status === "results" ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className="flex h-[70vh] flex-col gap-3">
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              {pending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : null}
              {results.length} {texts.resultsLabel}
              {resultQuery ? (
                <>
                  {" "}
                  {texts.resultsForLabel} «{resultQuery.term} ·{" "}
                  {resultQuery.city}»
                </>
              ) : null}
            </p>
            <div
              className={cn(
                "bg-card flex min-h-0 flex-1 flex-col rounded-md border transition-opacity",
                pending && "opacity-60",
              )}
            >
              <div className="scroll-list min-h-0 flex-1 overflow-y-auto">
                <div className="bg-card text-muted-foreground border-border sticky top-0 z-10 flex items-stretch border-b text-[10px] font-medium tracking-[0.08em] uppercase">
                  <span className="border-border flex w-10 items-center justify-center border-r">
                    {texts.registerIndexLabel}
                  </span>
                  <span className="flex flex-1 items-center gap-3 px-4 py-1.5">
                    {texts.navCompanies}
                    <span className="ml-auto flex items-center gap-2.5 normal-case">
                      {checked.size > 0 ? (
                        <>
                          <span className="text-foreground">
                            {checked.size} {texts.selectedSuffix}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSaveOpen(true)}
                            className="text-primary font-medium tracking-[0.08em] uppercase hover:underline"
                          >
                            {texts.saveToListAction}
                          </button>
                        </>
                      ) : (
                        <span>{texts.selectToSaveHint}</span>
                      )}
                    </span>
                  </span>
                  <span className="flex w-10 items-center justify-center">
                    <Checkbox
                      checked={
                        results.length > 0 &&
                        results.every((c) => checked.has(c.externalId))
                      }
                      onCheckedChange={(v) => toggleAll(v === true)}
                      aria-label={texts.selectAllAction}
                    />
                  </span>
                </div>
                <ul className="divide-border divide-y">
                  {results.map((c, i) => (
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
                            {c.address ? (
                              <>
                                <MapPin className="size-3.5 shrink-0" />
                                <span
                                  className="min-w-0 truncate"
                                  title={c.address}
                                >
                                  {c.address}
                                </span>
                              </>
                            ) : null}
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
            </div>
            {hasMore ? (
              <Button
                type="button"
                variant="outline"
                onClick={onLoadMore}
                disabled={pending}
              >
                {pending ? <LoaderCircle className="animate-spin" /> : null}
                {pending ? texts.searching : texts.loadMore}
              </Button>
            ) : null}
          </div>

          <div className="border-border relative sticky top-4 h-[70vh] self-start overflow-hidden rounded-md border">
            <CompaniesMap
              companies={results}
              searchKey={
                resultQuery ? `${resultQuery.term}|${resultQuery.city}` : ""
              }
              highlightedIndex={highlightedIndex}
              selectedIndex={selectedIndex}
              hoveredIndex={hoveredIndex}
              onSelect={select}
              onHover={setHoveredIndex}
            />
            {pending ? (
              // La mappa resta leggibile e interattiva: solo un chip
              // leggero in angolo segnala l'aggiornamento in corso.
              <div className="bg-card text-muted-foreground pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs">
                <LoaderCircle className="size-3.5 animate-spin" />
                {texts.updating}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <SaveDialog
        kind="company"
        items={results.filter((c) => checked.has(c.externalId))}
        defaultName={
          resultQuery ? `${resultQuery.term} ${resultQuery.city}` : ""
        }
        open={saveOpen}
        onOpenChange={setSaveOpen}
        onSaved={() => setChecked(new Set())}
      />
    </div>
  );
}

// Static placeholder for the idle state — same shape as a result card but
// dashed/muted and without pulse animation (pulse is the loading skeleton's
// job, so the two states read differently).
function PlaceholderCard() {
  return (
    <div
      aria-hidden="true"
      className="bg-card/50 flex h-[120px] items-center gap-3 rounded-md border border-dashed px-4 py-3"
    >
      <span className="bg-muted h-3 w-5 rounded" />
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="bg-muted h-4 w-2/3 rounded" />
        <span className="bg-muted h-3 w-4/5 rounded" />
        <span className="bg-muted h-3 w-3/5 rounded" />
        <span className="bg-muted h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

/** Appende deduplicando contro la lista già accumulata (il repo deduplica per pagina). */
function appendUnique(
  prev: CompanyResult[],
  next: CompanyResult[],
): CompanyResult[] {
  const seen = new Set(prev.map((c) => c.externalId));
  return [
    ...prev,
    ...next.filter((c) => {
      if (seen.has(c.externalId)) return false;
      seen.add(c.externalId);
      return true;
    }),
  ];
}
