import { cn } from "cn";
import { Globe, MapPin, Phone } from "lucide-react";
import { toneTileClasses } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";
import { texts } from "@/texts";

// Static, non-interactive mock of the companies search used on the landing.
// Fictional data — never wired to real searches.
const companies = [
  {
    name: "Officine Rossi",
    address: "Via Nizza 12, Torino",
    phone: "011 555 0134",
    site: "officinerossi.it",
  },
  {
    name: "MetalTech Torino",
    address: "Corso Orbassano 210, Torino",
    phone: "011 555 0972",
    site: "metaltechto.it",
  },
  {
    name: "Carpenteria Alpina",
    address: "Via Pinerolo 44, Torino",
    phone: "011 555 0441",
    site: "carpalpi.it",
  },
] as const;

const dots = [
  { left: "22%", top: "34%" },
  { left: "48%", top: "58%" },
  { left: "70%", top: "28%" },
  { left: "62%", top: "72%" },
] as const;

export function ProductPreview() {
  return (
    <div aria-hidden="true" className="bg-card rounded-2xl border shadow-md">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b px-4 py-3">
        <span className="bg-muted size-2.5 rounded-full" />
        <span className="bg-muted size-2.5 rounded-full" />
        <span className="bg-muted size-2.5 rounded-full" />
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* SearchBar lookalike */}
        <div className="bg-card ring-border flex items-center gap-1 rounded-2xl p-2 shadow-sm ring-1">
          <div className="relative flex-1">
            <Input
              disabled
              value="metalmeccaniche"
              className="h-10 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="relative flex-1">
            <Input
              disabled
              value="Torino"
              className="h-10 border-0 bg-transparent pl-3 shadow-none focus-visible:ring-0"
            />
          </div>
          <Button disabled size="lg" className="sm:h-10">
            {texts.searchAction}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Fake result cards */}
          <div className="flex flex-col gap-2">
            {companies.map((c, i) => (
              <div
                key={c.name}
                className={cn(
                  "bg-card flex flex-col gap-0.5 rounded-xl border p-3 text-sm shadow-xs",
                  i === 0 && "bg-accent/40 ring-primary ring-2",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold",
                      toneTileClasses.companies,
                    )}
                  >
                    {initials(c.name)}
                  </span>
                  <span className="truncate font-medium">{c.name}</span>
                </div>
                <div className="text-muted-foreground flex flex-col gap-0.5 pl-12">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{c.address}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" />
                    <span className="truncate">{c.phone}</span>
                    <span>·</span>
                    <Globe className="size-3.5 shrink-0" />
                    <span className="truncate">{c.site}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Fake map: dotted grid + pins */}
          <div className="bg-muted relative min-h-48 overflow-hidden rounded-xl bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px]">
            {dots.map((d) => (
              <span
                key={`${d.left}-${d.top}`}
                className="bg-companies border-card absolute size-3 rounded-full border-2"
                style={{ left: d.left, top: d.top }}
              />
            ))}
            <svg
              className="absolute"
              style={{ left: "38%", top: "44%" }}
              width="26"
              height="34"
              viewBox="0 0 24 32"
              aria-hidden="true"
            >
              <path
                d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"
                fill="var(--primary)"
              />
              <circle cx="12" cy="11.5" r="5" fill="var(--card)" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
