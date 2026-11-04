/*
 * Companies repo — ricerca aziende via engine google_maps.
 * Client/plumbing condiviso in lib/serpapi.ts; qui solo params + normalize.
 *
 * Tipi esportati: usati da ./actions (firma RPC) e importabili via
 * `import type` dai client component (zero bundle server-side).
 */

import { dedupe, querySerpApi } from "@/lib/serpapi";

export interface CompanySearchInput {
  /** Tipo azienda libero ("pizzeria") → q */
  term: string;
  /** Città libera ("Grugliasco") → concatenata in q, geocodifica delegata a Google */
  city: string;
  /** Offset per il load more (0, 20, 40…) → start */
  start: number;
}

export interface CompanyResult {
  /** Google Place ID: chiave dedupe + key React (+ future external_id su DB). */
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

/** Aziende per tipo + città → google_maps */
export async function searchCompany({
  term,
  city,
  start,
}: CompanySearchInput): Promise<CompanySearchResult> {
  // La città va dentro `q`: Google geocoda "pizzeria rivoli" come nella sua
  // UI web. Nessun `ll`/`location`: il bound geografico è comunque morbido.
  const params: Record<string, string> & { engine: "google_maps" } = {
    engine: "google_maps",
    q: `${term} ${city}`,
    start: String(start),
    type: "search",
    hl: "it",
    gl: "it",
  };
  const response = await querySerpApi(params);

  const companies = (response.local_results ?? []).map(
    (p): CompanyResult => ({
      key: p.place_id,
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
