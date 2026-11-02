import { readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { env } from "@/env";

/*
 * Layer condiviso SerpApi — usato dai repo delle feature (lib/<feature>/):
 *   - querySerpApi: call reale o fixture (SERPAPI_MOCK)
 *   - resolveCity:  geocoding Nominatim → coordinate + nome canonico
 *   - dedupe:       helper di deduplicazione generico
 *
 * MOCK: finché env.SERPAPI_MOCK !== "false" le call esterne non partono:
 * le fixture in debug/provders-api/out/ hanno la STESSA forma dei payload
 * reali. ATTENZIONE: debug/ è gitignored → su clone fresco non ci sono.
 */

const BASE_URL = "https://serpapi.com/search.json";
const USE_MOCK = env.SERPAPI_MOCK !== "false";

// ---------------------------------------------------------------------------
// Shape raw SerpApi (subset dei campi usati dai payload reali).
// Zod scarta i campi non dichiarati → il parse seleziona solo ciò che serve
// e lancia subito se SerpApi cambia formato. Privati: internals del provider.
// ---------------------------------------------------------------------------

const serpLocalResultSchema = z.object({
  title: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  gps_coordinates: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
    .optional(),
});

const serpJobResultSchema = z.object({
  job_id: z.string(),
  title: z.string().optional(),
  company_name: z.string().optional(),
  location: z.string().optional(),
  via: z.string().optional(),
  description: z.string().optional(),
  detected_extensions: z
    .object({ posted_at: z.string().optional(), salary: z.string().optional() })
    .optional(),
  apply_options: z
    .array(
      z.object({ title: z.string().optional(), link: z.string().optional() }),
    )
    .optional(),
});

const serpSearchResponseSchema = z.object({
  local_results: z.array(serpLocalResultSchema).optional(),
  jobs_results: z.array(serpJobResultSchema).optional(),
  serpapi_pagination: z
    .object({
      next: z.string().optional(),
      next_page_token: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export type SerpLocalResult = z.infer<typeof serpLocalResultSchema>;
export type SerpJobResult = z.infer<typeof serpJobResultSchema>;
export type SerpSearchResponse = z.infer<typeof serpSearchResponseSchema>;

// ---------------------------------------------------------------------------
// Call — 1 call riuscita = 1 credito. `querySerpApi` è l'unico punto di
// uscita: sopra c'è solo lo switch mock/reale.
// ---------------------------------------------------------------------------

async function callSerpApi(
  params: Record<string, string>,
): Promise<SerpSearchResponse> {
  const url = new URL(BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", env.SERPAPI_API_KEY ?? "");

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`SerpApi HTTP ${res.status}`);
  return serpSearchResponseSchema.parse(await res.json());
}

const FIXTURES_DIR = join(process.cwd(), "debug", "provders-api", "out");

const MOCK_FIXTURES: Record<string, string> = {
  google_maps: "google-maps-aziende-metalmeccaniche-rivoli.json",
  google_jobs: "google-jobs-manutentore-meccanico-rivoli.json",
};

const serpFixtureSchema = z.object({ response: serpSearchResponseSchema });

function mockResponse(params: Record<string, string>): SerpSearchResponse {
  const file = MOCK_FIXTURES[params.engine ?? ""];
  if (!file) throw new Error(`No mock fixture for engine "${params.engine}"`);
  return serpFixtureSchema.parse(
    JSON.parse(readFileSync(join(FIXTURES_DIR, file), "utf8")),
  ).response;
}

export function querySerpApi(
  params: Record<string, string>,
): Promise<SerpSearchResponse> {
  return USE_MOCK ? Promise.resolve(mockResponse(params)) : callSerpApi(params);
}

// ---------------------------------------------------------------------------
// Geocoding — Nominatim (OpenStreetMap). Free, nessuna key.
// locations.json di SerpApi non è utilizzabile: usa i nomi inglesi per le
// città maggiori ("Torino" → "Rivalta di Torino", "Milano" → Texas).
// Policy OSM: User-Agent identificativo, max 1 req/s → la cache copre.
// ---------------------------------------------------------------------------

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const nominatimResultSchema = z.object({
  /** Nominatim restituisce lat/lon come stringhe. */
  lat: z.string(),
  lon: z.string(),
  address: z
    .object({
      city: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
      municipality: z.string().optional(),
      /** Provincia/contea — fallback quando il top hit è un boundary amministrativo */
      county: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

export interface ResolvedLocation {
  /** Nome canonico SerpApi, es. "Turin,Piedmont,Italy" */
  canonicalName: string;
  lat: number;
  lng: number;
}

const locationCache = new Map<string, ResolvedLocation>();

/** Città → coordinate + nome canonico SerpApi. Cache per processo, chiave normalizzata. */
export async function resolveCity(city: string): Promise<ResolvedLocation> {
  //todo:capire se serve per forza questo remappping (o magari metti già cities suggerite da maps in modo da poter passare in input sol una tra le opzioi giuste?)
  const key = city.trim().toLowerCase();
  const cached = locationCache.get(key);
  if (cached) return cached;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", city);
  url.searchParams.set("format", "jsonv2");
  // limit > 1: il primo risultato può essere la PROVINCIA (boundary "county")
  // prima del comune — es. "vercelli". Serve scorrere qualche hit.
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "it");
  url.searchParams.set("addressdetails", "1");
  // In inglese Nominatim restituisce lo stesso nome canonico usato da SerpApi
  // ("Torino" → "Turin,Piedmont,Italy"), che `location` risolve alla città esatta.
  url.searchParams.set("accept-language", "en");

  const res = await fetch(url, {
    headers: { "User-Agent": "saas-template/1.0" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

  const results = z.array(nominatimResultSchema).parse(await res.json());
  // Preferisci il primo hit con una località vera (città/comune), non un
  // boundary amministrativo. Se nessuno la espone, si ripiega sul primo.
  const match =
    results.find(
      (r) =>
        r.address?.city ??
        r.address?.town ??
        r.address?.village ??
        r.address?.municipality,
    ) ?? results[0];
  if (!match) throw new Error(`Location not found: "${city}"`);

  const address = match.address ?? {};
  const locality =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county;
  if (!locality || !address.country) {
    throw new Error(`Incomplete address for "${city}"`);
  }

  const resolved: ResolvedLocation = {
    canonicalName: [locality, address.state, address.country]
      .filter(Boolean)
      .join(","),
    lat: Number(match.lat),
    lng: Number(match.lon),
  };
  locationCache.set(key, resolved);
  return resolved;
}

// ---------------------------------------------------------------------------
// Dedupe generico — il caller decide la chiave (già normalizzata).
// ---------------------------------------------------------------------------

export const dedupe = <T>(items: T[], key: (x: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
