import { cn } from "cn";
import { Radar } from "lucide-react";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-lg",
        className,
      )}
    >
      <Radar className="size-4" />
    </span>
  );
}
