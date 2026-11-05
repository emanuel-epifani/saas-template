"use client";

import { ArrowRight, Briefcase, Building2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SavedListWithCount } from "@/lib/db/queries";
import type { SavedListKind } from "@/lib/zod-schemas";
import { texts } from "@/texts";

const itemClass =
  "text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs";

// Specchio del QuickSearch: toggle «salvate» ↔ toggle «cerca» sopra,
// lista filtrata sotto — le due colonne rispondono 1:1.
export function ArchiveLists({ lists }: { lists: SavedListWithCount[] }) {
  const [kind, setKind] = useState<SavedListKind>("company");
  const visible = lists.filter((l) => l.kind === kind).slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        type="single"
        value={kind}
        onValueChange={(v) => {
          if (v === "company" || v === "job") setKind(v);
        }}
        className="bg-muted w-fit rounded-lg p-1"
      >
        <ToggleGroupItem value="company" className={itemClass}>
          <Building2 />
          {texts.savedGroupCompanies}
        </ToggleGroupItem>
        <ToggleGroupItem value="job" className={itemClass}>
          <Briefcase />
          {texts.savedGroupJobs}
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="bg-card rounded-md border">
        {visible.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            {texts.savedEmptyKind}
          </p>
        ) : (
          <div className="divide-border divide-y">
            {visible.map((l) => (
              <Link
                key={l.id}
                href={`/saved/${l.id}`}
                className="hover:bg-muted/50 group flex items-center gap-4 px-4 py-3.5 transition-colors"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium">{l.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {l.itemCount} {texts.savedItemsSuffix}
                  </span>
                </span>
                <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
        <div className="border-border border-t px-4 py-2.5">
          <Link
            href="/saved"
            className="text-primary flex items-center gap-1 text-sm font-medium"
          >
            {texts.dashboardSeeAll}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
