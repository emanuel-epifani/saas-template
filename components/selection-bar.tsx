"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { texts } from "@/texts";

/** Pill flottante "N selezionati → Salva in lista" sopra il fondo della lista. */
export function SelectionBar({
  count,
  onClear,
  onSave,
}: {
  count: number;
  onClear: () => void;
  onSave: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
      <div className="bg-foreground text-background flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4 shadow-lg">
        <span className="mr-1 text-sm font-medium whitespace-nowrap">
          {count} {texts.selectedSuffix}
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full"
          onClick={onSave}
        >
          {texts.saveToListAction}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={texts.clearSelectionAction}
          className="text-background/70 hover:bg-background/10 hover:text-background size-7 rounded-sm"
          onClick={onClear}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
