import { cn } from "cn";
import { Radar } from "lucide-react";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "ring-foreground/50 grid size-7 shrink-0 place-items-center rounded-md ring-1",
        className,
      )}
    >
      <Radar className="size-4" />
    </span>
  );
}
