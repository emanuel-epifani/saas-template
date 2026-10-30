"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { findJobOffers } from "@/lib/job-offers-and-companies/serpapi-actions";
import type { JobOfferResult } from "@/lib/job-offers-and-companies/serpapi-schemas";
import { texts } from "@/texts";

export function SearchSection() {
  const [term, setTerm] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<JobOfferResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSelectedIndex(null);
    startTransition(async () => {
      const data = await findJobOffers({ term, city });
      setResults(data);
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
          <div className="h-[70vh] overflow-hidden rounded-md border p-2">
            <ul className="scroll-list flex h-full flex-col gap-2 overflow-y-auto pr-1">
              {results.map((j, i) => (
                <li key={`${j.title}-${j.companyName ?? i}`}>
                  <button
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    type="button"
                    onClick={() => select(i)}
                    className={`flex h-30 w-full flex-col gap-0.5 overflow-hidden rounded-md border p-3 text-left text-sm transition-colors ${
                      i === selectedIndex
                        ? "border-primary bg-accent"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <strong className="truncate">{j.title}</strong>
                    <span className="text-muted-foreground truncate">
                      {j.companyName}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {j.location}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {j.via}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <aside className="sticky top-4 h-[70vh] self-start overflow-y-auto rounded-md border p-4">
            {selected ? (
              <div className="flex flex-col gap-3 text-sm">
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <p className="text-muted-foreground">
                  {selected.companyName}
                  {selected.location ? ` · ${selected.location}` : ""}
                </p>
                {selected.salary ? (
                  <p className="font-medium">{selected.salary}</p>
                ) : null}
                {selected.postedAt ? (
                  <p className="text-muted-foreground">{selected.postedAt}</p>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  {selected.via ? (
                    <p className="text-muted-foreground">{selected.via}</p>
                  ) : (
                    <span />
                  )}
                  {selected.applyLink ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setPreviewUrl(selected.applyLink ?? null)}
                    >
                      {texts.jobApplyAction}
                    </Button>
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
