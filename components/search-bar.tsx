import { LoaderCircle } from "lucide-react";

import type { SearchBarProps } from "@/app/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { texts } from "@/texts";

const cell =
  "border-border flex-1 cursor-text border-b px-3.5 pt-2 pb-2 transition-colors focus-within:bg-accent/50 sm:border-r sm:border-b-0";
const cellLabel =
  "text-muted-foreground block text-[10px] font-medium tracking-[0.08em] uppercase";
const field =
  "h-8 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0 placeholder:font-normal placeholder:text-muted-foreground/70";

// Segmented search band shared by the dashboard and both search pages —
// each cell carries its own uppercase label, like a form on a register.
// Presentational only: parents own the state and the submit side-effects.
export function SearchBar({
  idPrefix,
  term,
  onTermChange,
  termLabel,
  termPlaceholder,
  city,
  onCityChange,
  pending,
  onSubmit,
}: SearchBarProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="bg-card border-border flex flex-col overflow-hidden rounded-sm border sm:flex-row sm:items-stretch"
    >
      <label htmlFor={`${idPrefix}-term`} className={cell}>
        <span className={cellLabel}>{termLabel}</span>
        <Input
          id={`${idPrefix}-term`}
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          placeholder={termPlaceholder}
          required
          className={field}
        />
      </label>
      <label htmlFor={`${idPrefix}-city`} className={cell}>
        <span className={cellLabel}>{texts.cityLabel}</span>
        <Input
          id={`${idPrefix}-city`}
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder={texts.cityPlaceholder}
          required
          className={field}
        />
      </label>
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="min-h-12 rounded-none px-6 sm:h-auto sm:min-h-0"
      >
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        {pending ? texts.searching : texts.searchAction}
      </Button>
    </form>
  );
}
