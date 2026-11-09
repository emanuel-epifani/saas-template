import { readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { env } from "@/env";

/*
 * SerpApi provider — client condiviso + repo di ricerca (job offers):
 *   - querySerpApi:                  call reale o fixture (SERPAPI_MOCK), parse zod
 *   - searchJobOffer:                params + normalize per engine
 *   - dedupe:                        helper di deduplicazione generico
 *
 * MOCK: finché env.SERPAPI_MOCK !== "false" le call esterne non partono.
 * Ogni engine legge UN file json qui in lib/ (serpapi.<engine>.mock.json),
 * con la STESSA forma del payload reale salvato da una call live — tracciati in git.
 *
 * Tipi esportati (JobOfferResult, …): firma delle action in
 * lib/actions.ts, importabili via `import type` dai client component.
 */

const BASE_URL = "https://serpapi.com/search.json";
const USE_MOCK = env.SERPAPI_MOCK !== "false";

// ---------------------------------------------------------------------------
// Shape raw SerpApi (subset dei campi usati dai payload reali).
// Zod scarta i campi non dichiarati → il parse seleziona solo ciò che serve
// e lancia subito se SerpApi cambia formato. Privati: internals del provider.
// ---------------------------------------------------------------------------

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

// google_jobs pagina a token opaco: `next_page_token` va rimandato
// indietro com'è.
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

export type SerpJobResult = z.infer<typeof serpJobResultSchema>;
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
  google_jobs: {
    schema: serpJobsResponseSchema,
    mockFile: join("lib", "serpapi.jobs.mock.json"),
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

export async function querySerpApi(
  params: Record<string, string> & { engine: Engine },
): Promise<SerpJobsResponse> {
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

// ---------------------------------------------------------------------------
// Repos — params + normalize per engine. Sopra c'è solo plumbing; qui la
// forma pubblica dei risultati (firma delle action, tipi per il client).
// ---------------------------------------------------------------------------

export interface JobOfferSearchInput {
  /** Ruolo libero ("pizzaiolo") → q */
  term: string;
  /** Città libera ("Collegno") → dentro q */
  city: string;
  /** Token della pagina successiva (load more) → next_page_token */
  nextPageToken?: string;
}

export interface JobOfferResult {
  /** ID Google dell'annuncio (htidocid) — external_id su DB, dedupe + key React. */
  externalId: string;
  title: string;
  companyName: string;
  location: string;
  /** Fonte dell'annuncio ("via LinkedIn"). */
  via: string;
  description: string;
  applyLink: string;
}

export interface JobOfferSearchResult {
  jobs: JobOfferResult[];
  /** Token per la pagina successiva; assente quando non c'è altro. */
  nextPageToken?: string;
}

/** Offerte per ruolo + città → google_jobs */
export async function searchJobOffer({
  term,
  city,
  nextPageToken,
}: JobOfferSearchInput): Promise<JobOfferSearchResult> {
  const params: Record<string, string> & { engine: "google_jobs" } = {
    engine: "google_jobs",
    // Niente `location`: SerpApi accetta solo località del suo DB (le città
    // maggiori) e 400-erebbe sui paesi — es. "Borgomasino,Piedmont,Italy".
    // Verificato live: con la città in `q` i risultati sono identici.
    q: `${term} ${city}`,
    hl: "it",
    gl: "it",
  };
  if (nextPageToken) params.next_page_token = nextPageToken;
  const response = await querySerpApi(params);

  const jobs = (response.jobs_results ?? []).map(
    (j): JobOfferResult => ({
      externalId: jobHtidocid(j.job_id),
      title: j.title,
      companyName: j.company_name,
      location: j.location,
      via: j.via,
      description: j.description,
      applyLink: j.apply_options[0].link,
    }),
  );

  return {
    jobs: dedupe(jobs, (j) => j.externalId),
    nextPageToken: response.serpapi_pagination?.next_page_token,
  };
}
