import { z } from "zod";

/*
 * Schemi zod di confine per l'integrazione SerpApi — file NEUTRO:
 * nessun import server-only → importabile da client (RHF/zodResolver)
 * e server senza trascinare fs/env nel bundle.
 *
 * - input  → validati dalle actions (RPC boundary), riusabili dai form
 * - output → forma normalizzata dei dati che l'app consuma; i tipi
 *   derivano SOLO da qui (`z.infer`), mai riscritti a mano.
 */

// ---------------------------------------------------------------------------
// Input (client → action)
// ---------------------------------------------------------------------------

export const companySearchInputSchema = z.object({
  /** Tipo azienda libero ("pizzeria") → q */
  term: z.string().min(1),
  /** Città libera ("Grugliasco") → geocoding → ll */
  city: z.string().min(1),
  /** Offset per il load more (0, 20, 40…) → start */
  start: z.number().int().min(0).default(0),
});
export type CompanySearchInput = z.infer<typeof companySearchInputSchema>;

export const jobOfferSearchInputSchema = z.object({
  /** Ruolo libero ("pizzaiolo") → q */
  term: z.string().min(1),
  /** Città libera ("Collegno") → location */
  city: z.string().min(1),
});
export type JobOfferSearchInput = z.infer<typeof jobOfferSearchInputSchema>;

// ---------------------------------------------------------------------------
// Output normalizzati (repo → app)
// ---------------------------------------------------------------------------

export const companyResultSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
});
export type CompanyResult = z.infer<typeof companyResultSchema>;

/** Chiave di dedupe stabile per un'azienda (usata dal repo e dal client). */
export const companyKey = (c: CompanyResult): string =>
  `${c.name}|${c.address ?? ""}`.toLowerCase();

export const companySearchResultSchema = z.object({
  companies: z.array(companyResultSchema),
  /** true se SerpApi espone una pagina successiva */
  hasMore: z.boolean(),
});
export type CompanySearchResult = z.infer<typeof companySearchResultSchema>;

export const resolvedLocationSchema = z.object({
  /** Nome canonico SerpApi, es. "Turin,Piedmont,Italy" */
  canonicalName: z.string(),
  lat: z.number(),
  lng: z.number(),
});
export type ResolvedLocation = z.infer<typeof resolvedLocationSchema>;

export const jobOfferResultSchema = z.object({
  title: z.string(),
  companyName: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  postedAt: z.string().optional(),
  applyLink: z.string().optional(),
  via: z.string().optional(),
  description: z.string().optional(),
});
export type JobOfferResult = z.infer<typeof jobOfferResultSchema>;
