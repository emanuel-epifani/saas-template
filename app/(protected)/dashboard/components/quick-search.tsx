"use client";

import { Briefcase, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  COMPANY_EXAMPLES,
  companiesSearchHref,
  DEFAULT_RADIUS,
  RADIUS_OPTIONS,
} from "@/app/(protected)/companies/lib/search-params";
import {
  JOB_EXAMPLES,
  jobOffersSearchHref,
} from "@/app/(protected)/job-offers/lib/search-params";
import { markSearchIntent } from "@/app/(protected)/lib/search-intent";
import { SearchBar } from "@/components/search-bar";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { texts } from "@/texts";

type Mode = "companies" | "jobs";

export function QuickSearch() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("companies");
  const [term, setTerm] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);

  const examples = mode === "companies" ? COMPANY_EXAMPLES : JOB_EXAMPLES;

  function hrefFor(params: { term: string; city: string; radius?: number }) {
    return mode === "companies"
      ? companiesSearchHref({
          term: params.term,
          city: params.city,
          radius: params.radius ?? DEFAULT_RADIUS,
        })
      : jobOffersSearchHref({ term: params.term, city: params.city });
  }

  function onSubmit() {
    const href = hrefFor({ term, city, radius });
    markSearchIntent(href);
    router.push(href);
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

      <SearchBar
        idPrefix="quick"
        term={term}
        onTermChange={setTerm}
        termLabel={
          mode === "companies"
            ? texts.companiesTermLabel
            : texts.jobOffersTermLabel
        }
        termPlaceholder={
          mode === "companies"
            ? texts.companiesTermPlaceholder
            : texts.jobOffersTermPlaceholder
        }
        city={city}
        onCityChange={setCity}
        radius={
          mode === "companies"
            ? { value: radius, onChange: setRadius, options: RADIUS_OPTIONS }
            : undefined
        }
        onSubmit={onSubmit}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">
          {texts.dashboardExamplesLabel}
        </span>
        {examples.map((ex) => (
          <Badge key={ex.term} variant="outline" asChild>
            <Link
              href={hrefFor(ex)}
              onClick={() => markSearchIntent(hrefFor(ex))}
            >
              {ex.term} · {ex.city}
            </Link>
          </Badge>
        ))}
      </div>
    </section>
  );
}
