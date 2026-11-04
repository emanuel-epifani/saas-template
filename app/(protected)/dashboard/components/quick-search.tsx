"use client";

import { Briefcase, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { companiesSearchHref } from "@/app/(protected)/companies/lib/search-params";
import { jobOffersSearchHref } from "@/app/(protected)/job-offers/lib/search-params";
import { markSearchIntent } from "@/app/(protected)/lib/search-intent";
import { SearchBar } from "@/components/search-bar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { texts } from "@/texts";

type Mode = "companies" | "jobs";

export function QuickSearch() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("companies");
  const [term, setTerm] = useState("");
  const [city, setCity] = useState("");

  function onSubmit() {
    const href =
      mode === "companies"
        ? companiesSearchHref({ term, city })
        : jobOffersSearchHref({ term, city });
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
          <Building2 />
          {texts.navCompanies}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="jobs"
          className="text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs"
        >
          <Briefcase />
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
        onSubmit={onSubmit}
      />
    </section>
  );
}
