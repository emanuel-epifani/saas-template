import { LoaderCircle, MapPin, Search } from "lucide-react";

import type { SearchBarProps } from "@/app/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { texts } from "@/texts";

// Segmented search bar shared by the dashboard and both search pages —
// presentational only: parents own the state and the submit side-effects.
export function SearchBar({
  idPrefix,
  term,
  onTermChange,
  termLabel,
  termPlaceholder,
  city,
  onCityChange,
  radius,
  pending,
  onSubmit,
}: SearchBarProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="bg-card ring-border flex flex-col gap-1 rounded-2xl p-2 shadow-md ring-1 sm:flex-row sm:items-center"
    >
      <label htmlFor={`${idPrefix}-term`} className="sr-only">
        {termLabel}
      </label>
      <div className="relative flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id={`${idPrefix}-term`}
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          placeholder={termPlaceholder}
          required
          className="h-11 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
        />
      </div>
      <Separator
        orientation="vertical"
        className="hidden h-6 self-center sm:block"
      />
      <label htmlFor={`${idPrefix}-city`} className="sr-only">
        {texts.cityLabel}
      </label>
      <div className="relative flex-1">
        <MapPin className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id={`${idPrefix}-city`}
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder={texts.cityPlaceholder}
          required
          className="h-11 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
        />
      </div>
      {radius ? (
        <>
          <Separator
            orientation="vertical"
            className="hidden h-6 self-center sm:block"
          />
          <label htmlFor={`${idPrefix}-radius`} className="sr-only">
            {texts.radiusLabel}
          </label>
          <Select
            value={String(radius.value)}
            onValueChange={(v) => radius.onChange(Number(v))}
          >
            <SelectTrigger
              id={`${idPrefix}-radius`}
              className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {radius.options.map((o) => (
                <SelectItem key={o.km} value={String(o.km)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : null}
      <Button type="submit" size="xl" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        {pending ? texts.searching : texts.searchAction}
      </Button>
    </form>
  );
}
