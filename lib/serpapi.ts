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
 * MOCK: finché env.SERPAPI_MOCK !== "false" le call esterne non partono.
 * Ogni engine legge UN file json accanto al repo della feature
 * (lib/<feature>/serpapi.mock.json), con la STESSA forma del payload reale
 * salvato da una call live — sono tracciati in git.
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

// Due schemi standalone, uno per engine — condividono solo `error`.
// google_maps pagina a offset (`start`): `next` è solo un link alla
// pagina successiva, usato come flag "c'è altro". google_jobs pagina a
// token opaco: `next_page_token` va rimandato indietro com'è.
const serpMapsResponseSchema = z.object({
  local_results: z.array(serpLocalResultSchema).optional(),
  serpapi_pagination: z
    .object({ next: z.string().optional() })
    .optional(),
  error: z.string().optional(),
});

const serpJobsResponseSchema = z.object({
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
export type SerpMapsResponse = z.infer<typeof serpMapsResponseSchema>;
export type SerpJobsResponse = z.infer<typeof serpJobsResponseSchema>;

// ---------------------------------------------------------------------------
// Call — 1 call riuscita = 1 credito. `querySerpApi` è l'unico punto di
// uscita: sopra c'è solo lo switch mock/reale.
// Engine → schema del payload + file mock accanto al repo della feature:
// una sola fonte di verità per real e mock.
// ---------------------------------------------------------------------------

const engines = {
  google_maps: {
    schema: serpMapsResponseSchema,
    mockFile: join("lib", "companies", "serpapi.mock.json"),
  },
  google_jobs: {
    schema: serpJobsResponseSchema,
    mockFile: join("lib", "job-offers", "serpapi.mock.json"),
  },
} as const;

type Engine = keyof typeof engines;

async function fetchSerpApi(params: Record<string, string>): Promise<unknown> {
  const url = new URL(BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", env.SERPAPI_API_KEY ?? "");

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`SerpApi HTTP ${res.status}`);
  return res.json();
}

const serpFixtureEnvelopeSchema = z.object({ response: z.unknown() });

function readMockFile(file: string): unknown {
  return serpFixtureEnvelopeSchema.parse(
    JSON.parse(readFileSync(join(process.cwd(), file), "utf8")),
  ).response;
}

export function querySerpApi(
  params: Record<string, string> & { engine: "google_maps" },
): Promise<SerpMapsResponse>;
export function querySerpApi(
  params: Record<string, string> & { engine: "google_jobs" },
): Promise<SerpJobsResponse>;
export async function querySerpApi(
  params: Record<string, string> & { engine: Engine },
): Promise<SerpMapsResponse | SerpJobsResponse> {
  const { schema, mockFile } = engines[params.engine];
  const raw = USE_MOCK ? readMockFile(mockFile) : await fetchSerpApi(params);
  const response = schema.parse(raw);
  // SerpApi segnala gli errori a livello API (quota esaurita, parametri
  // invalidi) dentro HTTP 200, nel campo `error` — senza questo check
  // il caller li leggerebbe come "0 risultati".
  if (response.error) throw new Error(`SerpApi: ${response.error}`);
  return response;
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
