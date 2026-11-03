import { Globe, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const pins = [
  { n: 2, left: "22%", top: "30%" },
  { n: 3, left: "48%", top: "55%" },
  { n: 4, left: "70%", top: "25%" },
  { n: 5, left: "62%", top: "70%" },
] as const;

const cellLabel =
  "text-muted-foreground block text-[10px] font-medium tracking-[0.08em] uppercase";

export function ProductPreview() {
  return (
    <div aria-hidden="true" className="bg-card rounded-md border">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b px-4 py-3">
        <span className="bg-muted size-2.5 rounded-full" />
        <span className="bg-muted size-2.5 rounded-full" />
        <span className="bg-muted size-2.5 rounded-full" />
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* SearchBar lookalike: labeled cells, squared band */}
        <div className="bg-card border-border flex items-stretch overflow-hidden rounded-sm border">
          <div className="border-border flex-1 border-r px-3.5 pt-2 pb-2.5">
            <span className={cellLabel}>{texts.companiesTermLabel}</span>
            <span className="block text-sm font-medium">metalmeccaniche</span>
          </div>
          <div className="border-border flex-1 border-r px-3.5 pt-2 pb-2.5">
            <span className={cellLabel}>{texts.cityLabel}</span>
            <span className="block text-sm font-medium">Torino</span>
          </div>
          <div className="border-border border-r px-3.5 pt-2 pb-2.5">
            <span className={cellLabel}>{texts.radiusLabel}</span>
            <span className="block text-sm font-medium">25 km</span>
          </div>
          <Button disabled size="lg" className="h-auto rounded-none px-6">
            {texts.searchAction}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Fake result register */}
          <div className="divide-border bg-card flex flex-col divide-y rounded-md border">
            <div className="text-muted-foreground flex items-stretch text-[10px] font-medium tracking-[0.08em] uppercase">
              <span className="border-border flex w-10 items-center justify-center border-r">
                {texts.registerIndexLabel}
              </span>
              <span className="flex items-center px-3.5 py-1.5">
                {texts.navCompanies}
              </span>
            </div>
            <div className="divide-border divide-y">
              {companies.map((c, i) => (
                <div key={c.name} className="flex text-sm">
                  <span className="border-border bg-muted/40 text-muted-foreground flex w-10 shrink-0 items-center justify-center border-r font-mono text-xs font-medium tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1 px-3.5 py-2.5">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-muted-foreground mt-1 flex h-5 items-center gap-1.5 text-[13px]">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="min-w-0 truncate">{c.address}</span>
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex h-5 items-center gap-3 text-[13px] tabular-nums">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Phone className="size-3.5 shrink-0" />
                        <span className="truncate">{c.phone}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Globe className="size-3.5 shrink-0" />
                        <span className="truncate">{c.site}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fake map: dotted grid + teardrop pins */}
          <div className="bg-muted relative min-h-48 overflow-hidden rounded-md border bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px]">
            <span
              className="map-origin absolute"
              style={{ left: "42%", top: "46%" }}
            />
            <svg
              aria-hidden="true"
              className="map-pin is-active absolute"
              width="26"
              height="32"
              viewBox="0 0 26 32"
              style={{ left: "38%", top: "42%" }}
            >
              <path
                className="map-pin-shape"
                d="M13 1C6.4 1 1 6.4 1 13c0 8 12 18 12 18s12-10 12-18C25 6.4 19.6 1 13 1Z"
              />
              <text x="13" y="15.5" textAnchor="middle" className="map-pin-num">
                1
              </text>
            </svg>
            {pins.map((p) => (
              <svg
                aria-hidden="true"
                key={p.n}
                className="map-pin absolute"
                width="26"
                height="32"
                viewBox="0 0 26 32"
                style={{ left: p.left, top: p.top }}
              >
                <path
                  className="map-pin-shape"
                  d="M13 1C6.4 1 1 6.4 1 13c0 8 12 18 12 18s12-10 12-18C25 6.4 19.6 1 13 1Z"
                />
                <text
                  x="13"
                  y="15.5"
                  textAnchor="middle"
                  className="map-pin-num"
                >
                  {p.n}
                </text>
              </svg>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
