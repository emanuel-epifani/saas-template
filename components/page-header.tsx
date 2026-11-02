import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import type { NavTone } from "@/app/models";

export const toneTileClasses = {
  primary: "bg-primary/10 text-primary",
  companies: "bg-companies/10 text-companies",
  jobs: "bg-jobs/15 text-jobs-foreground",
} satisfies Record<NavTone, string>;

export function PageHeader({
  icon: Icon,
  title,
  description,
  tone = "primary",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: NavTone;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "grid size-10 place-items-center rounded-xl",
          toneTileClasses[tone],
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
