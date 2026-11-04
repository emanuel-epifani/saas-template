"use client";

import { cn } from "cn";
import {
  Briefcase,
  Building2,
  Globe,
  LoaderCircle,
  MapPin,
  MousePointerClick,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { findJobOffers } from "@/lib/job-offers/actions";
import type { JobOfferResult } from "@/lib/job-offers/serpapi";
import { texts } from "@/texts";
import { createSearchCache } from "../../lib/search-cache";
import { consumeSearchIntent } from "../../lib/search-intent";
import { jobOffersSearchHref } from "../lib/search-params";

interface Snapshot {
  results: JobOfferResult[];
  nextPageToken?: string;
  resultQuery: { term: string; city: string };
  selectedIndex: number | null;
}

const cache = createSearchCache<Snapshot>();

export function SearchSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("term") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [results, setResults] = useState<JobOfferResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [searched, setSearched] = useState(false);
  const [resultQuery, setResultQuery] = useState<{
    term: string;
    city: string;
  } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const autoSearched = useRef(false);

  const status =
    pending && results.length === 0
      ? "loading"
      : !searched
        ? "idle"
        : results.length === 0
          ? "empty"
          : "results";

  const selected = selectedIndex != null ? results[selectedIndex] : null;

  function runSearch(params: { term: string; city: string }) {
    setSelectedIndex(null);
    startTransition(async () => {
      try {
        const data = await findJobOffers(params);
        setResults(data.jobs);
        setNextPageToken(data.nextPageToken);
        setSearched(true);
        setResultQuery({ term: params.term, city: params.city });
      } catch {
        toast.error(texts.searchError);
      }
    });
  }

  function onSubmit() {
    const params = { term, city };
    router.replace(jobOffersSearchHref(params), { scroll: false });
    runSearch(params);
  }

  function onLoadMore() {
    // Continue the ACTIVE search (the «…» summary), not the form draft —
    // the draft may have been edited without pressing Cerca.
    if (!resultQuery) return;
    startTransition(async () => {
      try {
        const data = await findJobOffers({ ...resultQuery, nextPageToken });
        setResults((prev) => appendUnique(prev, data.jobs));
        setNextPageToken(data.nextPageToken);
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
    const params = { term, city };
    if (!params.term || !params.city) return;
    const href = jobOffersSearchHref(params);
    if (consumeSearchIntent(href)) {
      runSearch(params);
      return;
    }
    const snap = cache.restore(href);
    if (!snap) return;
    setResults(snap.results);
    setNextPageToken(snap.nextPageToken);
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
    cache.save(jobOffersSearchHref(resultQuery), {
      results,
      nextPageToken,
      resultQuery,
      selectedIndex,
    });
  }, [searched, results, nextPageToken, resultQuery, selectedIndex]);

  return (
    <div className="flex flex-col gap-6">
      <SearchBar
        idPrefix="job-offers"
        term={term}
        onTermChange={setTerm}
        termLabel={texts.jobOffersTermLabel}
        termPlaceholder={texts.jobOffersTermPlaceholder}
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
                <Briefcase className="text-muted-foreground size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-heading text-sm font-medium">
                  {texts.searchIdleTitle}
                </p>
                <p className="text-muted-foreground text-sm">
                  {texts.searchIdleDescJobs}
                </p>
              </div>
            </div>
            {Array.from({ length: 4 }, (_, i) => (
              <PlaceholderCard key={i} />
            ))}
          </div>
          <aside className="bg-card sticky top-4 h-[70vh] self-start overflow-y-auto rounded-md border p-4">
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MousePointerClick />
                </EmptyMedia>
                <EmptyDescription>{texts.jobDetailsIdle}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </aside>
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
              <Briefcase />
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
                "divide-border bg-card flex min-h-0 flex-1 flex-col divide-y rounded-md border transition-opacity",
                pending && "opacity-60",
              )}
            >
              <div className="text-muted-foreground flex shrink-0 items-stretch text-[10px] font-medium tracking-[0.08em] uppercase">
                <span className="border-border flex w-10 items-center justify-center border-r">
                  {texts.registerIndexLabel}
                </span>
                <span className="flex items-center px-4 py-1.5">
                  {texts.navJobOffers}
                </span>
              </div>
              <ul className="scroll-list divide-border min-h-0 flex-1 divide-y overflow-y-auto">
                {results.map((j, i) => (
                  <li key={j.externalId}>
                    <div
                      className={cn(
                        "relative flex h-[120px] text-sm transition-colors",
                        i === selectedIndex
                          ? "bg-accent/60"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <span
                        className={cn(
                          "border-border flex w-10 shrink-0 items-center justify-center border-r font-mono text-xs font-medium tabular-nums",
                          i === selectedIndex
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
                          className="block w-full cursor-pointer truncate text-left leading-6 font-medium after:absolute after:inset-0"
                        >
                          {j.title}
                        </button>
                        <div className="text-muted-foreground mt-1 flex h-6 items-center gap-2 text-[13px]">
                          <Building2 className="size-3.5 shrink-0" />
                          <span
                            className="min-w-0 truncate"
                            title={j.companyName}
                          >
                            {j.companyName}
                          </span>
                        </div>
                        <div className="text-muted-foreground flex h-6 items-center gap-2 text-[13px]">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="min-w-0 truncate" title={j.location}>
                            {j.location}
                          </span>
                        </div>
                        <div className="text-muted-foreground flex h-6 items-center gap-4 text-[13px] tabular-nums">
                          <span
                            className="flex min-w-0 items-center gap-2"
                            title={j.via}
                          >
                            <Globe className="size-3.5 shrink-0" />
                            <span className="truncate">{j.via}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {nextPageToken ? (
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

          <aside
            className={cn(
              "bg-card sticky top-4 h-[70vh] self-start overflow-y-auto rounded-md border p-4 transition-opacity",
              pending && "opacity-60",
            )}
          >
            {selected ? (
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-primary font-mono text-[11px] font-medium tracking-[0.08em] uppercase">
                    {texts.registerIndexLabel}{" "}
                    {String((selectedIndex ?? 0) + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-lg leading-snug font-semibold">
                    {selected.title}
                  </h2>
                  <p className="text-muted-foreground truncate">
                    {selected.companyName}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="flex items-center gap-2">
                    <MapPin className="text-muted-foreground size-4 shrink-0" />
                    <span className="truncate">{selected.location}</span>
                  </p>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Globe className="size-4 shrink-0" />
                    <span className="truncate">{selected.via}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild>
                    <a
                      href={selected.applyLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {texts.jobApplyAction}
                    </a>
                  </Button>
                </div>
                <Separator />
                <p className="text-muted-foreground whitespace-pre-line">
                  {selected.description}
                </p>
              </div>
            ) : (
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MousePointerClick />
                  </EmptyMedia>
                  <EmptyDescription>{texts.jobDetailsEmpty}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </aside>
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

/** Appende deduplicando contro la lista accumulata: stessa chiave del repo. */
function appendUnique(
  prev: JobOfferResult[],
  next: JobOfferResult[],
): JobOfferResult[] {
  const seen = new Set(prev.map((j) => j.externalId));
  return [...prev, ...next.filter((j) => !seen.has(j.externalId))];
}
