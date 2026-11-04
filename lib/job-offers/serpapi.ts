/*
 * Job offers repo — ricerca offerte via engine google_jobs.
 * Client/plumbing condiviso in lib/serpapi.ts; qui solo params + normalize.
 *
 * Tipi esportati: usati da ./actions (firma RPC) e importabili via
 * `import type` dai client component (zero bundle server-side).
 */

import { dedupe, jobHtidocid, querySerpApi } from "@/lib/serpapi";

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
