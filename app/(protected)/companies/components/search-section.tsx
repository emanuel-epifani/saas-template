"use client";

import { cn } from "cn";
import { Bookmark, Building2, Copy, Globe, MapPin, Phone } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { toneTileClasses } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { findCompanies } from "@/lib/companies/actions";
import type { CompanyResult } from "@/lib/companies/serpapi";
import { hostname, initials } from "@/lib/utils";
import { texts } from "@/texts";
import { consumeSearchIntent } from "../../lib/search-intent";
import {
  COMPANY_EXAMPLES,
  companiesSearchHref,
  parseRadius,
  RADIUS_OPTIONS,
  radiusLabel,
} from "../lib/search-params";

const CompaniesMap = dynamic(() => import("./companies-map"), { ssr: false });

const PAGE_SIZE = 20;

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
    const next = offset + PAGE_SIZE;
    startTransition(async () => {
      try {
        const data = await findCompanies({ term, city, start: next, radius });
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design
  useEffect(() => {
    if (autoSearched.current) return;
    autoSearched.current = true;
    const params = { term, city, radius };
    if (
      params.term &&
      params.city &&
      consumeSearchIntent(companiesSearchHref(params))
    ) {
      runSearch(params);
    }
  }, []);

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
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold",
                          toneTileClasses.companies,
                        )}
                      >
                        {initials(c.name)}
                      </span>
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
                    <div className="text-muted-foreground flex flex-col gap-0.5 pl-12">
                      {c.address ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </span>
                      ) : null}
                      {c.phone || c.website ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                          {c.phone ? (
                            <>
                              <Phone className="size-3.5 shrink-0" />
                              <span className="truncate">{c.phone}</span>
                            </>
                          ) : null}
                          {c.phone && c.website ? <span>·</span> : null}
                          {c.website ? (
                            <>
                              <Globe className="size-3.5 shrink-0" />
                              <span className="truncate">
                                {hostname(c.website)}
                              </span>
                            </>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                    <Separator className="my-2" />
                    <div className="relative z-10 flex items-center gap-1">
                      {c.phone ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" asChild>
                              <a href={`tel:${c.phone}`}>
                                <Phone />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{texts.callAction}</TooltipContent>
                        </Tooltip>
                      ) : null}
                      {c.website ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setPreviewUrl(c.website ?? null)}
                            >
                              <Globe />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {texts.previewSiteAction}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              navigator.clipboard
                                .writeText(
                                  [c.name, c.address, c.phone, c.website]
                                    .filter(Boolean)
                                    .join("\n"),
                                )
                                .then(() => toast.success(texts.copied));
                            }}
                          >
                            <Copy />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {texts.copyContactsAction}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-auto">
                            <Button variant="ghost" size="icon-sm" disabled>
                              <Bookmark />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{texts.saveSoon}</TooltipContent>
                      </Tooltip>
                    </div>
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

      <Dialog
        open={previewUrl != null}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
      >
        <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previewUrl}</DialogTitle>
          </DialogHeader>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title={previewUrl}
              className="h-[70vh] w-full rounded-md border"
            />
          ) : null}
          <Button asChild variant="outline" className="w-fit">
            <a href={previewUrl ?? "#"} target="_blank" rel="noreferrer">
              {texts.openSiteAction}
            </a>
          </Button>
        </DialogContent>
      </Dialog>
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
      className="bg-card/50 flex flex-col gap-2 rounded-xl border border-dashed p-3"
    >
      <div className="flex items-center gap-3">
        <span className="bg-muted size-9 rounded-lg" />
        <span className="bg-muted h-4 w-2/3 rounded" />
      </div>
      <div className="flex flex-col gap-1.5 pl-12">
        <span className="bg-muted h-3 w-4/5 rounded" />
        <span className="bg-muted h-3 w-3/5 rounded" />
      </div>
      <div className="mt-1 flex gap-1">
        <span className="bg-muted size-8 rounded-lg" />
        <span className="bg-muted size-8 rounded-lg" />
        <span className="bg-muted size-8 rounded-lg" />
        <span className="bg-muted ml-auto size-8 rounded-lg" />
      </div>
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
