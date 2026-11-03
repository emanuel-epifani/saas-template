"use client";

import { cn } from "cn";
import { Building2, Globe, MapPin, Phone } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { toneTileClasses } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { mapsDirectionsUrl } from "../lib/maps-url";
import {
  COMPANY_EXAMPLES,
  companiesSearchHref,
  parseRadius,
  RADIUS_OPTIONS,
  radiusLabel,
} from "../lib/search-params";

const CompaniesMap = dynamic(() => import("./companies-map"), { ssr: false });

const PAGE_SIZE = 20;

interface Snapshot {
  results: CompanyResult[];
  center: { lat: number; lng: number } | null;
  hasMore: boolean;
  offset: number;
  resultQuery: { term: string; city: string; radius: number };
  selectedIndex: number | null;
}

const cache = createSearchCache<Snapshot>();

export function SearchSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("term") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [radius, setRadius] = useState<number>(() =>
    parseRadius(searchParams.get("radius")),
  );
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [searched, setSearched] = useState(false);
  const [resultQuery, setResultQuery] = useState<{
    term: string;
    city: string;
    radius: number;
  } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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

  function runSearch(params: { term: string; city: string; radius: number }) {
    setSelectedIndex(null);
    startTransition(async () => {
      try {
        const data = await findCompanies({ ...params, start: 0 });
        setResults(data.companies);
        setHasMore(data.hasMore);
        setCenter(data.center);
        setOffset(0);
        setSearched(true);
        setResultQuery({
          term: params.term,
          city: params.city,
          radius: params.radius,
        });
      } catch {
        toast.error(texts.searchError);
      }
    });
  }

  function onSubmit() {
    const params = { term, city, radius };
    router.replace(companiesSearchHref(params), { scroll: false });
    runSearch(params);
  }

  // Idle-state example chips set the fields too, so the URL mirrors the form.
  function runExample(params: { term: string; city: string; radius: number }) {
    setTerm(params.term);
    setCity(params.city);
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

  function select(index: number) {
    setSelectedIndex(index);
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
    const params = { term, city, radius };
    if (!params.term || !params.city) return;
    const href = companiesSearchHref(params);
    if (consumeSearchIntent(href)) {
      runSearch(params);
      return;
    }
    const snap = cache.restore(href);
    if (!snap) return;
    setResults(snap.results);
    setCenter(snap.center);
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
      center,
      hasMore,
      offset,
      resultQuery,
      selectedIndex,
    });
  }, [searched, results, center, hasMore, offset, resultQuery, selectedIndex]);

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
        radius={{ value: radius, onChange: setRadius, options: RADIUS_OPTIONS }}
        pending={pending}
        onSubmit={onSubmit}
      />

      {status === "idle" ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className="flex h-[70vh] flex-col gap-3 p-1">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl",
                  toneTileClasses.companies,
                )}
              >
                <Building2 className="size-5" />
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
            <div className="flex flex-wrap gap-2">
              {COMPANY_EXAMPLES.map((ex) => (
                <Badge key={ex.term} variant="outline" asChild>
                  <button
                    type="button"
                    onClick={() =>
                      runExample({
                        term: ex.term,
                        city: ex.city,
                        radius,
                      })
                    }
                  >
                    {ex.term} · {ex.city}
                  </button>
                </Badge>
              ))}
            </div>
            {Array.from({ length: 4 }, (_, i) => (
              <PlaceholderCard key={i} />
            ))}
          </div>
          <div className="sticky top-4 h-[70vh] self-start overflow-hidden rounded-xl border shadow-sm">
            <CompaniesMap
              companies={[]}
              center={null}
              radiusM={radius * 1000}
              highlightedIndex={null}
              selectedIndex={null}
              onSelect={() => {}}
              onHover={() => {}}
            />
            <div className="bg-card/90 text-muted-foreground absolute top-3 left-1/2 z-[400] -translate-x-1/2 rounded-full px-3 py-1 text-xs shadow-sm">
              {texts.mapIdleHint}
            </div>
          </div>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className="flex h-[70vh] flex-col gap-3 p-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-28 shrink-0 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[70vh] rounded-xl" />
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
            <p className="text-muted-foreground text-sm">
              {results.length} {texts.resultsLabel}
              {resultQuery ? (
                <>
                  {" "}
                  {texts.resultsForLabel} «{resultQuery.term} ·{" "}
                  {resultQuery.city} · {radiusLabel(resultQuery.radius)}»
                </>
              ) : null}
            </p>
            <ul className="scroll-list flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1 pr-2">
              {results.map((c, i) => (
                <li
                  key={c.key}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div
                    className={cn(
                      "bg-card relative flex flex-col gap-0.5 rounded-xl border p-3 text-sm shadow-xs transition-colors",
                      i === highlightedIndex
                        ? "bg-accent/40 ring-primary ring-2"
                        : "hover:bg-accent/30",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        ref={(el) => {
                          cardRefs.current[i] = el;
                        }}
                        type="button"
                        onClick={() => select(i)}
                        className="min-w-0 flex-1 cursor-pointer truncate pt-0.5 text-left font-medium after:absolute after:inset-0"
                      >
                        {c.name}
                      </button>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {i + 1}
                      </span>
                    </div>
                    {c.address ? (
                      <a
                        href={mapsDirectionsUrl(c)}
                        target="_blank"
                        rel="noreferrer"
                        title={`${texts.directionsAction}: ${c.address}`}
                        aria-label={`${texts.directionsAction}: ${c.address}`}
                        className="text-muted-foreground focus-visible:ring-ring relative z-10 -mx-1 flex items-center gap-2 rounded-md px-1 py-1 text-sm outline-none focus-visible:ring-2"
                      >
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="min-w-0 truncate">{c.address}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground/60 -mx-1 flex items-center gap-2 px-1 py-1 text-sm">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="min-w-0 truncate">
                          {texts.noAddress}
                        </span>
                      </span>
                    )}
                    {c.phone ? (
                      <a
                        href={`tel:${c.phone.replace(/\s+/g, "")}`}
                        title={`${texts.callAction}: ${c.phone}`}
                        aria-label={`${texts.callAction}: ${c.phone}`}
                        className="text-muted-foreground focus-visible:ring-ring relative z-10 -mx-1 flex items-center gap-2 rounded-md px-1 py-1 text-sm outline-none focus-visible:ring-2"
                      >
                        <Phone className="size-3.5 shrink-0" />
                        <span className="min-w-0 truncate">{c.phone}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground/60 -mx-1 flex items-center gap-2 px-1 py-1 text-sm">
                        <Phone className="size-3.5 shrink-0" />
                        <span className="min-w-0 truncate">
                          {texts.noPhone}
                        </span>
                      </span>
                    )}
                    {c.website ? (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        title={`${texts.openSiteAction}: ${c.website}`}
                        aria-label={`${texts.openSiteAction}: ${c.website}`}
                        className="text-muted-foreground focus-visible:ring-ring relative z-10 -mx-1 flex items-center gap-2 rounded-md px-1 py-1 text-sm outline-none focus-visible:ring-2"
                      >
                        <Globe className="size-3.5 shrink-0" />
                        <span className="min-w-0 truncate">
                          {hostname(c.website)}
                        </span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground/60 -mx-1 flex items-center gap-2 px-1 py-1 text-sm">
                        <Globe className="size-3.5 shrink-0" />
                        <span className="min-w-0 truncate">
                          {texts.noWebsite}
                        </span>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {hasMore ? (
              <Button
                type="button"
                variant="outline"
                onClick={onLoadMore}
                disabled={pending}
              >
                {pending ? texts.searching : texts.loadMore}
              </Button>
            ) : null}
          </div>

          <div className="sticky top-4 h-[70vh] self-start overflow-hidden rounded-xl border shadow-sm">
            <CompaniesMap
              companies={results}
              center={center}
              radiusM={radius * 1000}
              highlightedIndex={highlightedIndex}
              selectedIndex={selectedIndex}
              onSelect={select}
              onHover={setHoveredIndex}
            />
          </div>
        </div>
      ) : null}
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
      className="bg-card/50 flex flex-col gap-1.5 rounded-xl border border-dashed p-3"
    >
      <span className="bg-muted h-4 w-2/3 rounded" />
      <span className="bg-muted h-3 w-4/5 rounded" />
      <span className="bg-muted h-3 w-3/5 rounded" />
      <span className="bg-muted h-3 w-1/2 rounded" />
    </div>
  );
}

/** Appende deduplicando contro la lista già accumulata (il repo deduplica per pagina). */
function appendUnique(
  prev: CompanyResult[],
  next: CompanyResult[],
): CompanyResult[] {
  const seen = new Set(prev.map((c) => c.key));
  return [
    ...prev,
    ...next.filter((c) => {
      if (seen.has(c.key)) return false;
      seen.add(c.key);
      return true;
    }),
  ];
}
