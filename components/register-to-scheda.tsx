import { ArrowRight, Check } from "lucide-react";

import { texts } from "@/texts";

// Educational diagram for empty archive states: a register row from the
// radar becomes a scheda in the archive once saved. Fictional example
// data — static illustration, hidden from assistive tech.
export function RegisterToScheda() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center"
    >
      <div className="bg-card border-border flex min-w-0 flex-1 overflow-hidden rounded-md border text-sm">
        <span className="border-border bg-muted/40 text-muted-foreground flex w-9 shrink-0 items-center justify-center border-r font-mono text-xs font-medium tabular-nums">
          01
        </span>
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <div className="truncate font-medium">Officine Rossi</div>
          <div className="text-muted-foreground truncate text-xs">
            Via Nizza 12 · 011 555 0134
          </div>
        </div>
      </div>
      <ArrowRight className="text-muted-foreground size-4 shrink-0 self-center max-sm:rotate-90" />
      <div className="bg-card border-border flex min-w-0 flex-1 flex-col gap-1 rounded-md border px-3 py-2.5 text-sm">
        <span className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
          {texts.schedaLabel}
        </span>
        <div className="truncate font-medium">Officine Rossi</div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Check className="size-3 shrink-0" />
          <span className="truncate">P.IVA · fido · 3 note</span>
        </div>
      </div>
    </div>
  );
}
