"use client";

import { cn } from "cn";
import {
  Banknote,
  Bookmark,
  Briefcase,
  Building2,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  MapPin,
  MousePointerClick,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  companiesSearchHref,
  DEFAULT_RADIUS,
} from "@/app/(protected)/companies/lib/search-params";
import { toneTileClasses } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
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
import { findJobOffers } from "@/lib/job-offers/actions";
import type { JobOfferResult } from "@/lib/job-offers/serpapi";
import { initials } from "@/lib/utils";
import { texts } from "@/texts";

import { JOB_EXAMPLES, jobOffersSearchHref } from "../lib/search-params";

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

  // Idle-state example chips set the fields too, so the URL mirrors the form.
  function runExample(params: { term: string; city: string }) {
    setTerm(params.term);
    setCity(params.city);
    router.replace(jobOffersSearchHref(params), { scroll: false });
    runSearch(params);
  }

  function onLoadMore() {
    startTransition(async () => {
      try {
        const data = await findJobOffers({ term, city, nextPageToken });
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

  // URL-prefill: fire once on mount when the URL already carries a search
  // (e.g. linked from the dashboard). The ref survives StrictMode's double
  // effect — each runSearch is a paid SerpAPI call. Deps intentionally
  // empty: back/forward navigation does NOT re-search (accepted trade-off).
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design
  useEffect(() => {
    if (autoSearched.current) return;
    autoSearched.current = true;
    const params = { term, city };
    if (params.term && params.city) runSearch(params);
  }, []);

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
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon" className={toneTileClasses.jobs}>
              <Briefcase />
            </EmptyMedia>
            <EmptyTitle>{texts.searchIdleTitle}</EmptyTitle>
            <EmptyDescription>{texts.searchIdleDescJobs}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              {JOB_EXAMPLES.map((ex) => (
                <Badge key={ex.term} variant="outline" asChild>
                  <button type="button" onClick={() => runExample(ex)}>
                    {ex.term} · {ex.city}
                  </button>
                </Badge>
              ))}
            </div>
          </EmptyContent>
        </Empty>
      ) : null}

      {status === "loading" ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className="flex h-[70vh] flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-30 shrink-0 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[70vh] rounded-xl" />
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
            <p className="text-muted-foreground text-sm">
              {results.length} {texts.resultsLabel}
              {resultQuery ? (
                <>
                  {" "}
                  {texts.resultsForLabel} «{resultQuery.term} ·{" "}
                  {resultQuery.city}»
                </>
              ) : null}
            </p>
            <ul className="scroll-list flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {results.map((j, i) => (
                <li key={j.jobId}>
                  <div
                    className={cn(
                      "bg-card relative flex flex-col gap-0.5 rounded-xl border p-3 text-sm shadow-xs transition-colors",
                      i === selectedIndex
                        ? "bg-accent/40 ring-primary ring-2"
                        : "hover:bg-accent/30",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold",
                          toneTileClasses.jobs,
                        )}
                      >
                        {initials(j.companyName ?? j.title)}
                      </span>
                      <button
                        ref={(el) => {
                          cardRefs.current[i] = el;
                        }}
                        type="button"
                        onClick={() => select(i)}
                        className="min-w-0 flex-1 cursor-pointer truncate pt-0.5 text-left font-medium after:absolute after:inset-0"
                      >
                        {j.title}
                      </button>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {i + 1}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex flex-col gap-0.5 pl-12">
                      {j.companyName ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Building2 className="size-3.5 shrink-0" />
                          <span className="truncate">{j.companyName}</span>
                        </span>
                      ) : null}
                      {j.location ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="truncate">{j.location}</span>
                        </span>
                      ) : null}
                    </div>
                    {j.via || j.postedAt || j.salary ? (
                      <div className="mt-1 flex flex-wrap gap-1.5 pl-12">
                        {j.via ? (
                          <Badge variant="outline">{j.via}</Badge>
                        ) : null}
                        {j.postedAt ? (
                          <Badge variant="secondary">{j.postedAt}</Badge>
                        ) : null}
                        {j.salary ? (
                          <Badge variant="jobs">{j.salary}</Badge>
                        ) : null}
                      </div>
                    ) : null}
                    <Separator className="my-2" />
                    <div className="relative z-10 flex items-center gap-1">
                      {j.applyLink ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" asChild>
                              <a
                                href={j.applyLink}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {texts.jobApplyAction}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                      {j.companyName ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" asChild>
                              <Link
                                href={companiesSearchHref({
                                  term: j.companyName,
                                  city: j.location ?? city,
                                  radius: DEFAULT_RADIUS,
                                })}
                              >
                                <Building2 className="text-companies" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {texts.findCompanyContacts}
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
                                  [
                                    j.title,
                                    j.companyName,
                                    j.location,
                                    j.applyLink,
                                  ]
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
            {nextPageToken ? (
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

          <aside className="bg-card sticky top-4 h-[70vh] self-start overflow-y-auto rounded-xl border p-4 shadow-sm">
            {selected ? (
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold",
                      toneTileClasses.jobs,
                    )}
                  >
                    {initials(selected.companyName ?? selected.title)}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="text-lg leading-snug font-semibold">
                      {selected.title}
                    </h2>
                    {selected.companyName ? (
                      <p className="text-muted-foreground truncate">
                        {selected.companyName}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {selected.location ? (
                    <p className="flex items-center gap-2">
                      <MapPin className="text-muted-foreground size-4 shrink-0" />
                      <span className="truncate">{selected.location}</span>
                    </p>
                  ) : null}
                  {selected.salary ? (
                    <p className="flex items-center gap-2 font-medium">
                      <Banknote className="text-muted-foreground size-4 shrink-0" />
                      <span>{selected.salary}</span>
                    </p>
                  ) : null}
                  {selected.postedAt ? (
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Clock className="size-4 shrink-0" />
                      <span>{selected.postedAt}</span>
                    </p>
                  ) : null}
                  {selected.via ? (
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Globe className="size-4 shrink-0" />
                      <span className="truncate">{selected.via}</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selected.applyLink ? (
                    <Button asChild>
                      <a
                        href={selected.applyLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {texts.jobApplyAction}
                      </a>
                    </Button>
                  ) : null}
                  {selected.companyName ? (
                    <Button asChild variant="outline">
                      <Link
                        href={companiesSearchHref({
                          term: selected.companyName,
                          city: selected.location ?? city,
                          radius: DEFAULT_RADIUS,
                        })}
                      >
                        {texts.findCompanyContacts}
                      </Link>
                    </Button>
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button variant="ghost" size="icon" disabled>
                          <Bookmark />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{texts.saveSoon}</TooltipContent>
                  </Tooltip>
                </div>
                {selected.description ? (
                  <>
                    <Separator />
                    <p className="text-muted-foreground whitespace-pre-line">
                      {selected.description}
                    </p>
                  </>
                ) : null}
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

/** Appende deduplicando contro la lista accumulata: stessa chiave del repo. */
function appendUnique(
  prev: JobOfferResult[],
  next: JobOfferResult[],
): JobOfferResult[] {
  const seen = new Set(prev.map((j) => j.jobId));
  return [...prev, ...next.filter((j) => !seen.has(j.jobId))];
}
