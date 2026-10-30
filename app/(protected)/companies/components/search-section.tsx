"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { findCompanies } from "@/lib/job-offers-and-companies/serpapi-actions";
import {
  type CompanyResult,
  companyKey,
} from "@/lib/job-offers-and-companies/serpapi-schemas";
import { texts } from "@/texts";

const CompaniesMap = dynamic(() => import("./companies-map"), { ssr: false });

const PAGE_SIZE = 20;

export function SearchSection() {
  const [term, setTerm] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const highlightedIndex = hoveredIndex ?? selectedIndex;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSelectedIndex(null);
    startTransition(async () => {
      const data = await findCompanies({ term, city, start: 0 });
      setResults(data.companies);
      setHasMore(data.hasMore);
      setOffset(0);
    });
  }

  function onLoadMore() {
    const next = offset + PAGE_SIZE;
    startTransition(async () => {
      const data = await findCompanies({ term, city, start: next });
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
        className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[400px_1fr_auto]"
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
        <Button type="submit" disabled={pending}>
          {pending ? texts.searching : texts.searchAction}
        </Button>
      </form>

      {results.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <div className="flex h-[70vh] flex-col gap-3">
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border p-2">
              <ul className="scroll-list flex h-full flex-col gap-2 overflow-y-auto pr-1">
                {results.map((c, i) => (
                  <li
                    key={companyKey(c)}
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
                      className={`flex h-30 w-full cursor-pointer flex-col gap-0.5 overflow-hidden rounded-md border p-3 text-left text-sm transition-colors ${
                        i === highlightedIndex
                          ? "border-primary bg-accent"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <strong className="truncate">{c.name}</strong>
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
                {pending ? texts.searching : texts.companiesLoadMore}
              </Button>
            ) : null}
          </div>

          <div className="sticky top-4 h-[70vh] self-start overflow-hidden rounded-md border">
            <CompaniesMap
              companies={results}
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
  const seen = new Set(prev.map(companyKey));
  return [
    ...prev,
    ...next.filter((c) => {
      const key = companyKey(c);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];
}
