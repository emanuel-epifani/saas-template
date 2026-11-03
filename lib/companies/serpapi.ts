/*
 * Companies repo — ricerca aziende via engine google_maps.
 * Client/plumbing condiviso in lib/serpapi.ts; qui solo params + normalize.
 *
 * Tipi esportati: usati da ./actions (firma RPC) e importabili via
 * `import type` dai client component (zero bundle server-side).
 */

import { dedupe, querySerpApi, resolveCity } from "@/lib/serpapi";

export interface CompanySearchInput {
  /** Tipo azienda libero ("pizzeria") → q */
  term: string;
  /** Città libera ("Grugliasco") → geocoding → ll */
  city: string;
  /** Offset per il load more (0, 20, 40…) → start */
  start: number;
  /** Raggio dell'area di ricerca in km → convertito in zoom di ll */
  radius: number;
}

export interface CompanyResult {
  /** Chiave dedupe + key React: name|address (calcolata al normalize). */
  key: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  lat?: number;
  lon?: number;
}

export interface CompanySearchResult {
  companies: CompanyResult[];
  /** true se SerpApi espone una pagina successiva */
  hasMore: boolean;
  /** Centro geocodificato della città — la UI ci disegna il cerchio del raggio. */
  center: { lat: number; lng: number };
}

const companyKey = (name: string, address?: string): string =>
  `${name}|${address ?? ""}`.toLowerCase();

/**
 * Raggio (km) → zoom `ll`. Il parametro reale è l'altezza del viewport
 * (zoom 14 ≈ 10 km ≈ raggio 5 km); ogni zoom -1 raddoppia l'area.
 * È un'approssimazione: per SerpApi il bound geografico non è un filtro duro.
 */
const radiusToZoom = (radiusKm: number): number =>
  Math.min(30, Math.max(3, Math.round(14 - Math.log2(radiusKm / 5))));

/** Aziende per tipo + città → google_maps */
export async function searchCompany({
  term,
  city,
  start,
  radius,
}: CompanySearchInput): Promise<CompanySearchResult> {
  const { lat, lng } = await resolveCity(city);
  const params = {
    engine: "google_maps",
    q: term,
    ll: `@${lat},${lng},${radiusToZoom(radius)}z`,
    start: String(start),
    type: "search",
    hl: "it",
    gl: "it",
  };
  const response = await querySerpApi(params);

  const companies = (response.local_results ?? []).map(
    (p): CompanyResult => ({
      key: companyKey(p.title ?? "", p.address),
      name: p.title ?? "",
      address: p.address,
      phone: p.phone,
      website: p.website,
      lat: p.gps_coordinates?.latitude,
      lon: p.gps_coordinates?.longitude,
    }),
  );

  return {
    companies: dedupe(companies, (c) => c.key),
    hasMore: Boolean(response.serpapi_pagination?.next),
    center: { lat, lng },
  };
}
