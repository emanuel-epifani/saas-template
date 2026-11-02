"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { findCompanies } from "@/lib/companies/actions";
import type { CompanyResult } from "@/lib/companies/serpapi";
import { texts } from "@/texts";

import {
  companiesSearchHref,
  parseRadius,
  RADIUS_OPTIONS,
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const autoSearched = useRef(false);

  const highlightedIndex = hoveredIndex ?? selectedIndex;

  function runSearch(params: { term: string; city: string; radius: number }) {
    setSelectedIndex(null);
    startTransition(async () => {
      const data = await findCompanies({ ...params, start: 0 });
      setResults(data.companies);
      setHasMore(data.hasMore);
      setCenter(data.center);
      setOffset(0);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = { term, city, radius };
    router.replace(companiesSearchHref(params), { scroll: false });
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
    const params = { term, city, radius };
    if (params.term && params.city) runSearch(params);
  }, []);

  function onLoadMore() {
    const next = offset + PAGE_SIZE;
    startTransition(async () => {
      const data = await findCompanies({ term, city, start: next, radius });
      setResults((prev) => appendUnique(prev, data.companies));
      setHasMore(data.hasMore);
      setOffset(next);
    });
  }

  function select(index: number) {
    setSelectedIndex(index);
    cardRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={onSubmit}
        className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_160px_auto]"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="term" className="text-sm font-medium">
            {texts.companiesTermLabel}
          </label>
          <Input
            id="term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={texts.companiesTermPlaceholder}
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="radius" className="text-sm font-medium">
            {texts.radiusLabel}
          </label>
          <Select
            value={String(radius)}
            onValueChange={(v) => setRadius(Number(v))}
          >
            <SelectTrigger id="radius">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((o) => (
                <SelectItem key={o.km} value={String(o.km)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                {results.map((c, i) => (
                  <li
                    key={c.key}
                    className="relative"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <button
                      ref={(el) => {
                        cardRefs.current[i] = el;
                      }}
                      type="button"
                      onClick={() => select(i)}
                      className={`relative flex w-full cursor-pointer flex-col gap-0.5 overflow-hidden rounded-md border p-3 text-left text-sm transition-colors ${
                        i === highlightedIndex
                          ? "border-primary bg-accent"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <span className="text-muted-foreground absolute top-2 right-2 text-xs tabular-nums">
                        {i + 1}
                      </span>
                      <strong className="truncate pr-6">{c.name}</strong>
                      <span className="text-muted-foreground truncate">
                        {c.address}
                      </span>
                      <span className="text-muted-foreground truncate">
                        {c.phone}
                      </span>
                      {/* riserva la riga del sito: il trigger preview è il sibling assoluto sotto */}
                      {c.website ? (
                        <span className="invisible w-fit truncate">
                          {c.website}
                        </span>
                      ) : null}
                    </button>
                    {c.website ? (
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(c.website ?? null)}
                        className="text-primary absolute bottom-3 left-3 w-fit max-w-[calc(100%-1.5rem)] truncate p-0 text-left text-sm hover:underline"
                      >
                        {c.website}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
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

          <div className="sticky top-4 h-[70vh] self-start overflow-hidden rounded-md border">
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
      )}

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
