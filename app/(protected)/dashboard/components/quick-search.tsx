"use client";

import { Briefcase, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
        ? companiesPlacesHref({ term, city })
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
          {texts.navSearchCompanies}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="jobs"
          className="text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs"
        >
          <Briefcase />
          {texts.navSearchJobs}
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

// La ricerca aziende vive su /companies-google: `term` + un comune (il campo
// "city" è un singolo comune, non una lista).
function companiesPlacesHref({ term, city }: { term: string; city: string }) {
  const params = new URLSearchParams();
  if (term) params.set("term", term);
  if (city) params.set("comuni", city);
  const qs = params.toString();
  return qs ? `/companies-google?${qs}` : "/companies-google";
}
