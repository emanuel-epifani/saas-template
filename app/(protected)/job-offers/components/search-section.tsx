"use client";

import { Banknote, Building2, Clock, Globe, MapPin } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findJobOffers } from "@/lib/job-offers/actions";
import type { JobOfferResult } from "@/lib/job-offers/serpapi";
import { texts } from "@/texts";

import { jobOffersSearchHref } from "../lib/search-params";

export function SearchSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("term") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [results, setResults] = useState<JobOfferResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const autoSearched = useRef(false);

  function runSearch(params: { term: string; city: string }) {
    setSelectedIndex(null);
    startTransition(async () => {
      const data = await findJobOffers(params);
      setResults(data.jobs);
      setNextPageToken(data.nextPageToken);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = { term, city };
    router.replace(jobOffersSearchHref(params), { scroll: false });
    runSearch(params);
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

  function onLoadMore() {
    startTransition(async () => {
      const data = await findJobOffers({ term, city, nextPageToken });
      setResults((prev) => appendUnique(prev, data.jobs));
      setNextPageToken(data.nextPageToken);
    });
  }

  function select(index: number) {
    setSelectedIndex(index);
    cardRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  const selected = selectedIndex != null ? results[selectedIndex] : null;

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={onSubmit}
        className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[400px_1fr_auto]"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="term" className="text-sm font-medium">
            {texts.jobOffersTermLabel}
          </label>
          <Input
            id="term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={texts.jobOffersTermPlaceholder}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className="text-sm font-medium">
            {texts.cityLabel}
          </label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={texts.cityPlaceholder}
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? texts.searching : texts.searchAction}
        </Button>
      </form>

      {results.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <div className="flex h-[70vh] flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              {results.length} {texts.resultsLabel}
            </p>
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border p-2">
              <ul className="scroll-list flex h-full flex-col gap-2 overflow-y-auto pr-1">
                {results.map((j, i) => (
                  <li key={`${j.title}-${j.companyName ?? i}`}>
                    <button
                      ref={(el) => {
                        cardRefs.current[i] = el;
                      }}
                      type="button"
                      onClick={() => select(i)}
                      className={`relative flex h-30 w-full flex-col gap-0.5 overflow-hidden rounded-md border p-3 text-left text-sm transition-colors ${
                        i === selectedIndex
                          ? "border-primary bg-accent"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <span className="text-muted-foreground absolute top-2 right-2 text-xs tabular-nums">
                        {i + 1}
                      </span>
                      <strong className="truncate pr-6">{j.title}</strong>
                      <span className="text-muted-foreground flex min-w-0 items-center gap-1.5">
                        <Building2 className="size-3.5 shrink-0" />
                        <span className="truncate">{j.companyName}</span>
                      </span>
                      <span className="text-muted-foreground flex min-w-0 items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">{j.location}</span>
                      </span>
                      <span className="text-muted-foreground flex min-w-0 items-center gap-1.5">
                        <Globe className="size-3.5 shrink-0" />
                        <span className="truncate">{j.via}</span>
                      </span>
                    </button>
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
                {pending ? texts.searching : texts.loadMore}
              </Button>
            ) : null}
          </div>

          <aside className="sticky top-4 h-[70vh] self-start overflow-y-auto rounded-md border p-4">
            {selected ? (
              <div className="flex flex-col gap-3 text-sm">
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <div className="flex flex-col gap-2">
                  {selected.companyName ? (
                    <p className="flex items-center gap-2">
                      <Building2 className="text-muted-foreground size-4 shrink-0" />
                      <span className="truncate">{selected.companyName}</span>
                    </p>
                  ) : null}
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
                  {selected.via || selected.applyLink ? (
                    <div className="flex items-center justify-between gap-3">
                      {selected.via ? (
                        <p className="text-muted-foreground flex min-w-0 items-center gap-2">
                          <Globe className="size-4 shrink-0" />
                          <span className="truncate">{selected.via}</span>
                        </p>
                      ) : (
                        <span />
                      )}
                      {selected.applyLink ? (
                        <Button asChild size="sm" className="shrink-0">
                          <a
                            href={selected.applyLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {texts.jobApplyAction}
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {selected.description ? (
                  <p className="text-muted-foreground border-t pt-3 whitespace-pre-line">
                    {selected.description}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {texts.jobDetailsEmpty}
              </p>
            )}
          </aside>
        </div>
      )}
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
