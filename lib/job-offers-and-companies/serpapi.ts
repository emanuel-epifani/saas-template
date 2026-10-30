import { readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { env } from "@/env";
import {
  type CompanyResult,
  type CompanySearchInput,
  type CompanySearchResult,
  companyKey,
  type JobOfferResult,
  type JobOfferSearchInput,
  type ResolvedLocation,
} from "./serpapi-schemas";

/*
 * SerpApi repository — unico punto di accesso a SerpApi per l'app.
 *
 * Due feature:
 *   - searchCompany  → engine google_maps   (aziende per tipo + città)
 *   - searchJobOffer → engine google_jobs   (offerte per ruolo + città)
 *
 * Multi-città verificato live: una query con due comuni è inaffidabile
 * → qui si fa UNA call per città e si mergiano/deduplicano i risultati.
 *
 * MOCK: finché env.SERPAPI_MOCK !== "false" le call esterne non partono:
 * i metodi restituiscono fixture realistiche con la STESSA forma dei
 * payload SerpApi reali (vedi debug/provders-api/out/*.json). Quando il
 * mock si spegne, solo `callSerpApi` cambia fonte — l'output normalizzato
 * resta identico, quindi i componenti non si toccano.
 */

const BASE_URL = "https://serpapi.com/search.json";
const USE_MOCK = env.SERPAPI_MOCK !== "false";

// Tipi pubblici (CompanyResult, JobOfferResult) e schemi di input:
// ./serpapi-schemas — file neutro condiviso con il client.

// ---------------------------------------------------------------------------
// Shape raw SerpApi (subset dei campi che usiamo dai payload reali).
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
  serpapi_pagination: z.object({ next: z.string().optional() }).optional(),
  error: z.string().optional(),
});

type SerpSearchResponse = z.infer<typeof serpSearchResponseSchema>;

// ---------------------------------------------------------------------------
// Call reale (non invocata finché USE_MOCK). 1 call riuscita = 1 credito.
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

// ---------------------------------------------------------------------------
// Mock — risposte REALI SerpApi salvate dagli script di test.
// Fixture: debug/provders-api/out/<slug>.json { request, httpStatus, response }
// ATTENZIONE: debug/ è gitignored → su clone fresco queste fixture non ci sono.
// ---------------------------------------------------------------------------

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

const locationCache = new Map<string, ResolvedLocation>();

/**
 * Zoom del viewport passato a `ll`. Determina il raggio della ricerca:
 * 12 ≈ 40 km (includeva Biella/Cossato), 14 ≈ 10 km (resta nel comune).
 */
const CITY_ZOOM = 14;

/** Città → coordinate + nome canonico SerpApi. Cache per processo, chiave normalizzata. */
async function resolveCity(city: string): Promise<ResolvedLocation> {
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
// Metodi pubblici
// ---------------------------------------------------------------------------

const dedupe = <T>(items: T[], key: (x: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((x) => {
    const k = key(x).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

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
  const response = USE_MOCK ? mockResponse(params) : await callSerpApi(params);

  const companies = (response.local_results ?? []).map(
    (p): CompanyResult => ({
      name: p.title ?? "",
      address: p.address,
      phone: p.phone,
      website: p.website,
      lat: p.gps_coordinates?.latitude,
      lon: p.gps_coordinates?.longitude,
    }),
  );

  return {
    companies: dedupe(companies, companyKey),
    hasMore: Boolean(response.serpapi_pagination?.next),
  };
}

/** Offerte per ruolo + città → google_jobs */
export async function searchJobOffer({
  term,
  city,
}: JobOfferSearchInput): Promise<JobOfferResult[]> {
  const { canonicalName } = await resolveCity(city);
  const params = {
    engine: "google_jobs",
    q: term,
    location: canonicalName,
    hl: "it",
    gl: "it",
  };
  const response = USE_MOCK ? mockResponse(params) : await callSerpApi(params);

  const jobs = (response.jobs_results ?? []).map(
    (j): JobOfferResult => ({
      title: j.title ?? "",
      companyName: j.company_name,
      location: j.location,
      salary: j.detected_extensions?.salary,
      postedAt: j.detected_extensions?.posted_at,
      applyLink: j.apply_options?.[0]?.link,
      via: j.via,
      description: j.description,
    }),
  );

  return dedupe(
    jobs,
    (j) => `${j.title}|${j.companyName ?? ""}|${j.location ?? ""}`,
  );
}
