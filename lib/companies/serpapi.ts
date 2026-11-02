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
}

const companyKey = (name: string, address?: string): string =>
  `${name}|${address ?? ""}`.toLowerCase();

/**
 * Zoom del viewport passato a `ll`. Determina il raggio della ricerca:
 * 12 ≈ 40 km (includeva Biella/Cossato), 14 ≈ 10 km (resta nel comune).
 */
const CITY_ZOOM = 14;

/** Aziende per tipo + città → google_maps */
export async function searchCompany({
  term,
  city,
  start,
}: CompanySearchInput): Promise<CompanySearchResult> {
  const { lat, lng } = await resolveCity(city);
  const params = {
    engine: "google_maps",
    q: term,
    ll: `@${lat},${lng},${CITY_ZOOM}z`,
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
  };
}
