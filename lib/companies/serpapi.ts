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
  /** Città libera ("Grugliasco") → concatenata in q, risolve Google */
  city: string;
  /** Offset per il load more (0, 20, 40…) → start */
  start: number;
}

export interface CompanyResult {
  /** Google Place ID — external_id su DB, chiave dedupe + key React. */
  externalId: string;
  name: string;
  address?: string;
  /** Categoria Google localizzata ("Lavorazione dei metalli") — filtro a DB. */
  type: string;
  phone?: string;
  website?: string;
  lat: number;
  lon: number;
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
  const params: Record<string, string> & { engine: "google_maps" } = {
    engine: "google_maps",
    // q libera "cosa dove": Google risolve tutto (geocoding + ranking).
    // Limite noto e accettato: senza anchor `ll` la coda dei risultati può
    // derivare fuori zona su ricerche oscure — se torna il problema,
    // l'anchor va ripresa (comuni dataset o autocomplete lato FE).
    q: `${term} ${city}`,
    start: String(start),
    type: "search",
    hl: "it",
    gl: "it",
  };
  const response = await querySerpApi(params);

  const companies = (response.local_results ?? []).map(
    (p): CompanyResult => ({
      externalId: p.place_id,
      name: p.title,
      address: p.address,
      type: p.type,
      phone: p.phone,
      website: p.website,
      lat: p.gps_coordinates.latitude,
      lon: p.gps_coordinates.longitude,
    }),
  );

  return {
    companies: dedupe(companies, (c) => c.externalId),
    hasMore: Boolean(response.serpapi_pagination?.next),
  };
}
