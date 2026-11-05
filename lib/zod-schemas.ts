/*
 * Zod contracts — input/output condivisi di tutta l'app.
 * File NEUTRO: niente import server-only → sicuro per client bundle
 * (componenti che passano i payload alle action) e server.
 * Boundary types escono da qui: `z.infer<typeof Schema>` è la single source.
 */

// Side-effect: abilita il JIT compiler di Zod — gli schemi sotto vengono
// compilati (new Function) al primo parse; fallback automatico al runtime
// parser su feature non supportate o ambienti senza eval (Edge/jitless).
import "zod/compile";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Search inputs (SerpApi) — validati al boundary delle action prima di
// spendere crediti sulle call esterne.
// ---------------------------------------------------------------------------

export const companySearchInputSchema = z.object({
  /** Tipo azienda libero ("pizzeria") → q */
  term: z.string().min(1),
  /** Città libera ("Grugliasco") → concatenata in q */
  city: z.string().min(1),
  /** Offset per il load more (0, 20, 40…) → start */
  start: z.number().int().min(0).default(0),
});

export const jobOfferSearchInputSchema = z.object({
  /** Ruolo libero ("pizzaiolo") → q */
  term: z.string().min(1),
  /** Città libera ("Collegno") → location */
  city: z.string().min(1),
  /** Token della pagina successiva (load more) → next_page_token */
  nextPageToken: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Search inputs (OpenApi Company) — filtri strutturati verso /IT-search.
// dryRun=1 è gratis e torna {count, cost} → stima prima di spendere.
// ---------------------------------------------------------------------------

export const openApiDataEnrichmentSchema = z.enum([
  "name",
  "address",
  "pec",
  "shareholders",
  "start",
  "advanced",
]);

export const openApiCompanySearchInputSchema = z
  .object({
    /** Ragione sociale (min 3 char, `*` wildcard) → companyName */
    companyName: z
      .string()
      .trim()
      .min(3, "Ragione sociale: minimo 3 caratteri")
      .max(120)
      .optional(),
    /** Codice catastale/Belfiore comune ("H501" = Roma) → townCode */
    townCode: z
      .string()
      .trim()
      .regex(/^[a-zA-Z][0-9a-zA-Z]{3}$/, "Codice comune non valido")
      .transform((v) => v.toUpperCase())
      .optional(),
    /** Sigla provincia ("TO") → province */
    province: z
      .string()
      .trim()
      .regex(/^[a-zA-Z]{2}$/, "Sigla provincia non valida")
      .transform((v) => v.toUpperCase())
      .optional(),
    /** Codice ATECO 2025 canonico ("56" … "56.11.11" — più preciso = più stretto) */
    atecoCode: z
      .string()
      .trim()
      .regex(
        /^[0-9]{2}(\.[0-9](\.[0-9](\.[0-9](\.[0-9])?)?)?)?$/,
        "Codice ATECO non valido",
      )
      .optional(),
    activityStatus: z
      .enum([
        "ATTIVA",
        "CESSATA",
        "REGISTRATA",
        "INATTIVA",
        "SOSPESA",
        "IN_ISCRIZIONE",
      ])
      .optional(),
    skip: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(1000).default(20),
    /** Solo per la stima: l'enrichment scelto cambia il prezzo. */
    dataEnrichment: openApiDataEnrichmentSchema.optional(),
  })
  // L'API torna 204 su query senza filtri: almeno un filtro è obbligatorio.
  .refine(
    (v) => v.companyName || v.townCode || v.province || v.atecoCode,
    "Serve almeno un filtro",
  );

export const openApiCompanyIdInputSchema = z.object({
  /** P.IVA, C.F. o id interno Openapi → /IT-marketing/{id} */
  id: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Saved domain (archivio utente)
// ---------------------------------------------------------------------------

export const savedListKindSchema = z.enum(["company", "job"]);
export type SavedListKind = z.infer<typeof savedListKindSchema>;

// Colonna custom di una lista (registro Airtable-style): `key` è la chiave
// dentro item.extra, `label` è l'intestazione visibile in tabella.
export const extraColumnSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
});
export type ExtraColumn = z.infer<typeof extraColumnSchema>;

// Snapshot azienda salvata — specchio di CompanyResult (lib/serpapi).
export const savedCompanyItemSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
});
export type SavedCompanyItem = z.infer<typeof savedCompanyItemSchema>;

// Snapshot offerta salvata — specchio di JobOfferResult (lib/serpapi).
export const savedJobItemSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  companyName: z.string().min(1),
  location: z.string().min(1),
  via: z.string().min(1),
  description: z.string(),
  applyLink: z.string().min(1),
});
export type SavedJobItem = z.infer<typeof savedJobItemSchema>;

const listTarget = {
  /** Lista esistente — ha priorità se presente. */
  listId: z.string().uuid().optional(),
  /** Nome per una lista nuova (o riuso se esiste già con lo stesso nome). */
  listName: z.string().trim().min(1).max(80).optional(),
};

export const saveItemsInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("company"),
    ...listTarget,
    items: z.array(savedCompanyItemSchema).min(1).max(500),
  }),
  z.object({
    kind: z.literal("job"),
    ...listTarget,
    items: z.array(savedJobItemSchema).min(1).max(500),
  }),
]);

export const myListsInputSchema = z.object({
  kind: savedListKindSchema.optional(),
});

export const listIdInputSchema = z.object({
  listId: z.string().uuid(),
});

export const renameListInputSchema = z.object({
  listId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
});

export const addColumnInputSchema = z.object({
  listId: z.string().uuid(),
  label: z.string().trim().min(1).max(40),
});

export const deleteItemInputSchema = z.object({
  kind: savedListKindSchema,
  itemId: z.string().uuid(),
});

export const updateItemInputSchema = z.object({
  kind: savedListKindSchema,
  itemId: z.string().uuid(),
  notes: z.string().max(8000).nullable().optional(),
  /** Sostituzione completa del blob extra (il client fonde le chiavi). */
  extra: z.record(z.string().max(40), z.string().max(2000)).optional(),
});
