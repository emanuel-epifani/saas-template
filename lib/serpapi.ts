import { readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { env } from "@/env";

/*
 * Layer condiviso SerpApi — usato dai repo delle feature (lib/<feature>/):
 *   - querySerpApi: call reale o fixture (SERPAPI_MOCK)
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

// Campi required = strutturali di un local_result (identità, nome, pin,
// classificazione Google): se mancano SerpApi ha cambiato formato → il
// parse deve lanciare. Optional = metadati di contatto che i thin listing
// non hanno davvero (es. service-area business senza via/telefono:
// verificato live — su aree sparse ~metà dei risultati li omette).
const serpLocalResultSchema = z.object({
  /** Google Place ID — sempre presente nei local_results, chiave dedupe. */
  place_id: z.string(),
  title: z.string(),
  /** Categoria Google localizzata ("Lavorazione dei metalli"). */
  type: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  gps_coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

const serpJobResultSchema = z.object({
  job_id: z.string(),
  title: z.string(),
  company_name: z.string(),
  location: z.string(),
  via: z.string(),
  description: z.string(),
  /** Sempre ≥1 opzione con link nei payload reali → tupla: [0] garantito a compile time. */
  apply_options: z.tuple(
    [z.object({ link: z.string() })],
    z.object({ link: z.string() }),
  ),
});

// Due schemi standalone, uno per engine — condividono solo `error`.
// google_maps pagina a offset (`start`): `next` è solo un link alla
// pagina successiva, usato come flag "c'è altro". google_jobs pagina a
// token opaco: `next_page_token` va rimandato indietro com'è.
const serpMapsResponseSchema = z.object({
  local_results: z.array(serpLocalResultSchema).optional(),
  serpapi_pagination: z.object({ next: z.string().optional() }).optional(),
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
// `restrictor` = json_restrictor: chiede a SerpApi solo i campi usati
// (payload più piccolo, parse più veloce). `error` incluso sempre — senza,
// gli errori API tornerebbero {} e li leggeremmo come "0 risultati".
// Il restrictor entra nella cache key SerpApi: è una costante, quindi le
// query identiche condividono comunque la cache.
// ---------------------------------------------------------------------------

const engines = {
  google_maps: {
    schema: serpMapsResponseSchema,
    mockFile: join("lib", "companies", "serpapi.mock.json"),
    restrictor:
      "error, serpapi_pagination.next, local_results[].{place_id, title, address, type, phone, website, gps_coordinates.latitude, gps_coordinates.longitude}",
  },
  google_jobs: {
    schema: serpJobsResponseSchema,
    mockFile: join("lib", "job-offers", "serpapi.mock.json"),
    restrictor:
      "error, serpapi_pagination.next_page_token, jobs_results[].{job_id, title, company_name, location, via, description, apply_options[].link}",
  },
} as const;

type Engine = keyof typeof engines;

async function fetchSerpApi(params: Record<string, string>): Promise<unknown> {
  const url = new URL(BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", env.API_KEY_SERPAPI ?? "");

  // Timeout 30s: scrape "freschi" su query oscure misurati a 8-60s lato
  // SerpApi (poi la cache loro li rende istantanei per ~1h).
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    // DOMException: `message` getter-only → crasha la serializzazione
    // errori di Next. Rilancia come Error normale.
    if (e instanceof DOMException) {
      throw new Error("SerpApi request timed out");
    }
    throw e;
  }
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
  const { schema, mockFile, restrictor } = engines[params.engine];
  const raw = USE_MOCK
    ? readMockFile(mockFile)
    : await fetchSerpApi({ ...params, json_restrictor: restrictor });
  const response = schema.parse(raw);
  // `error` in SerpApi copre DUE casi: errori API veri (quota, parametri
  // invalidi) → lancia; e "0 risultati" ("<Engine> hasn't returned any
  // results for this query.") → non è un errore, torna la response così
  // com'è: gli array risultati sono assenti → il normalize dà lista vuota.
  if (
    response.error &&
    !response.error.includes("hasn't returned any results")
  ) {
    throw new Error(`SerpApi: ${response.error}`);
  }
  return response;
}

// ---------------------------------------------------------------------------
// google_jobs — job_id NON è un ID stabile (token per google_jobs_listing):
// è base64 di un JSON che incorpora contesto della ricerca (uule, gl, hl, fc).
// L'ID Google dell'annuncio è htidocid, stabile cross-run → chiave dedupe.
// Formato interno non contrattuale: se cambia il parse lancia e la ricerca
// fallisce rumorosamente (come gli altri schemi) — niente fallback silenziosi.
// ---------------------------------------------------------------------------

const jobIdPayloadSchema = z.object({
  htidocid: z.string(),
});

export function jobHtidocid(jobId: string): string {
  return jobIdPayloadSchema.parse(
    JSON.parse(Buffer.from(jobId, "base64").toString("utf8")),
  ).htidocid;
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
