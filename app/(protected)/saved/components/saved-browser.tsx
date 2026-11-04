"use client";

import { Briefcase, Building2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SavedListWithCount } from "@/lib/saved/repo";
import type { SavedListKind } from "@/lib/saved/schemas";
import { texts } from "@/texts";

const itemClass =
  "text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs";

const dateFmt = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" });

/** Archivio: segmented control per kind + lista verticale delle liste. */
export function SavedBrowser({ lists }: { lists: SavedListWithCount[] }) {
  const [kind, setKind] = useState<SavedListKind>("company");
  const visible = lists.filter((l) => l.kind === kind);
  const KindIcon = kind === "company" ? Building2 : Briefcase;

  return (
    <div className="flex flex-col gap-4">
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
          {texts.savedKindCompanies}
        </ToggleGroupItem>
        <ToggleGroupItem value="job" className={itemClass}>
          <Briefcase />
          {texts.savedKindJobs}
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="bg-card divide-border divide-y rounded-md border">
        {visible.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            {texts.savedEmptyKind}
          </p>
        ) : (
          visible.map((l) => (
            <Link
              key={l.id}
              href={`/saved/${l.id}`}
              className="hover:bg-muted/50 group flex items-center gap-4 px-4 py-3.5 transition-colors"
            >
              <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-md">
                <KindIcon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {l.name}
              </span>
              <Badge variant="secondary" className="shrink-0">
                {l.itemCount} {texts.savedItemsSuffix}
              </Badge>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {dateFmt.format(l.updatedAt)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
