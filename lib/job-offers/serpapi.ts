/*
 * Job offers repo — ricerca offerte via engine google_jobs.
 * Client/plumbing condiviso in lib/serpapi.ts; qui solo params + normalize.
 *
 * Tipi esportati: usati da ./actions (firma RPC) e importabili via
 * `import type` dai client component (zero bundle server-side).
 */

import { dedupe, jobHtidocid, querySerpApi, resolveCity } from "@/lib/serpapi";

export interface JobOfferSearchInput {
  /** Ruolo libero ("pizzaiolo") → q */
  term: string;
  /** Città libera ("Collegno") → location */
  city: string;
  /** Token della pagina successiva (load more) → next_page_token */
  nextPageToken?: string;
}

export interface JobOfferResult {
  /** ID Google dell'annuncio (htidocid, estratto da job_id) — dedupe + key React. */
  htidocid: string;
  title: string;
  companyName?: string;
  location?: string;
  salary?: string;
  postedAt?: string;
  applyLink?: string;
  via?: string;
  description?: string;
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
  const { canonicalName } = await resolveCity(city);
  const params: Record<string, string> & { engine: "google_jobs" } = {
    engine: "google_jobs",
    // La città va anche in `q`: `location` da solo filtra a livello di
    // provincia, quindi "pizzaiolo" + Collegno restituiva tutta l'area
    // torinese. Il match testuale restringe al comune.
    q: `${term} ${city}`,
    location: canonicalName,
    hl: "it",
    gl: "it",
  };
  if (nextPageToken) params.next_page_token = nextPageToken;
  const response = await querySerpApi(params);

  const jobs = (response.jobs_results ?? []).map(
    (j): JobOfferResult => ({
      htidocid: jobHtidocid(j.job_id),
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

  return {
    jobs: dedupe(jobs, (j) => j.htidocid),
    nextPageToken: response.serpapi_pagination?.next_page_token,
  };
}
