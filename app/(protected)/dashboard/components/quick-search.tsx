"use client";

import { Briefcase, Building2, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  companiesSearchHref,
  DEFAULT_RADIUS,
  RADIUS_OPTIONS,
} from "@/app/(protected)/companies/lib/search-params";
import { jobOffersSearchHref } from "@/app/(protected)/job-offers/lib/search-params";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { texts } from "@/texts";

type Mode = "companies" | "jobs";

const examples = {
  companies: [
    { term: "metalmeccaniche", city: "Torino" },
    { term: "logistica", city: "Milano" },
    { term: "ristorazione", city: "Bologna" },
  ],
  jobs: [
    { term: "magazziniere", city: "Milano" },
    { term: "operaio", city: "Torino" },
    { term: "addetto vendite", city: "Roma" },
  ],
} satisfies Record<Mode, { term: string; city: string }[]>;

export function QuickSearch() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("companies");
  const [term, setTerm] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);

  function hrefFor(params: { term: string; city: string; radius?: number }) {
    return mode === "companies"
      ? companiesSearchHref({
          term: params.term,
          city: params.city,
          radius: params.radius ?? DEFAULT_RADIUS,
        })
      : jobOffersSearchHref({ term: params.term, city: params.city });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(hrefFor({ term, city, radius }));
  }

  return (
    <section className="flex flex-col gap-3">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(v) => {
          if (v === "companies" || v === "jobs") setMode(v);
        }}
        className="bg-muted w-fit rounded-lg p-1"
      >
        <ToggleGroupItem
          value="companies"
          className="text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs"
        >
          <Building2 className="text-companies" />
          {texts.navCompanies}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="jobs"
          className="text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs"
        >
          <Briefcase className="text-jobs" />
          {texts.navJobOffers}
        </ToggleGroupItem>
      </ToggleGroup>

      <form
        onSubmit={onSubmit}
        className="bg-card ring-border flex flex-col gap-1 rounded-2xl p-2 shadow-md ring-1 sm:flex-row sm:items-center"
      >
        <label htmlFor="quick-term" className="sr-only">
          {mode === "companies"
            ? texts.companiesTermLabel
            : texts.jobOffersTermLabel}
        </label>
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="quick-term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={
              mode === "companies"
                ? texts.companiesTermPlaceholder
                : texts.jobOffersTermPlaceholder
            }
            required
            className="h-11 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
          />
        </div>
        <Separator
          orientation="vertical"
          className="hidden h-6 self-center sm:block"
        />
        <label htmlFor="quick-city" className="sr-only">
          {texts.cityLabel}
        </label>
        <div className="relative flex-1">
          <MapPin className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="quick-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={texts.cityPlaceholder}
            required
            className="h-11 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
          />
        </div>
        {mode === "companies" ? (
          <>
            <Separator
              orientation="vertical"
              className="hidden h-6 self-center sm:block"
            />
            <label htmlFor="quick-radius" className="sr-only">
              {texts.radiusLabel}
            </label>
            <Select
              value={String(radius)}
              onValueChange={(v) => setRadius(Number(v))}
            >
              <SelectTrigger
                id="quick-radius"
                className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
              >
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
          </>
        ) : null}
        <Button type="submit" size="xl">
          {texts.searchAction}
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">
          {texts.dashboardExamplesLabel}
        </span>
        {examples[mode].map((ex) => (
          <Badge key={ex.term} variant="outline" asChild>
            <Link href={hrefFor(ex)}>
              {ex.term} · {ex.city}
            </Link>
          </Badge>
        ))}
      </div>
    </section>
  );
}
