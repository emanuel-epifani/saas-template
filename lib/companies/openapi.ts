import { z } from "zod";

import { env } from "@/env";

/*
 * Openapi Company provider — ricerca aziende sul registro imprese italiano
 * (Camera di Commercio) via GET /IT-search.
 *
 * DIFFERENZA vs SerpAPI: niente free-text "cosa dove" — i filtri sono
 * strutturati: `townCode` (Belfiore) = comune ESATTO, `atecoCode` = categoria
 * ufficiale, `companyName` = solo ragione sociale. Parametri, dataset e
 * prezzi: lib/companies/companies-openapi.md.
 *
 * SANDBOX: con OPENAPI_SANDBOX !== "false" le call vanno su
 * test.company.openapi.com — gratis, crediti finti regolabili in console,
 * stessi payload della produzione → niente file mock come in serpapi.ts.
 *
 * COSTO: in produzione si paga PER RECORD restituito → il flow corretto è
 * `countCompaniesOpenApi` (dryRun, gratis) → fetch con `limit` consapevole.
 *
 * AUTH: Bearer token da console.openapi.com → OAuth → New Token con scope
 * GET:{test.}company.openapi.com/IT-search. In .env.local come OPENAPI_TOKEN.
 */

const BASE_URL =
  env.OPENAPI_SANDBOX !== "false"
    ? "https://test.company.openapi.com"
    : "https://company.openapi.com";

/** Vero finché il client punta alla sandbox → badge "sandbox" in pagina. */
export function isOpenApiSandbox(): boolean {
  return env.OPENAPI_SANDBOX !== "false";
}

// ---------------------------------------------------------------------------
// Shape raw Openapi (subset dei campi, da OAS company.openapi.json).
// L'envelope è sempre {data, success, message, error}; `error` è un codice
// int (es. 610 = credito insufficiente con HTTP 402). Zod scarta i campi non
// dichiarati come in serpapi.ts. Campi nullable nell'OAS → nullish.
// ---------------------------------------------------------------------------

const openApiEnvelopeSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.number().nullable().optional(),
});

// Enrichment "name": id, P.IVA, CF, denominazione, comune sede legale.
const openApiNameRecordSchema = z.object({
  /** ID interno Openapi — external_id su DB, chiave dedupe. */
  id: z.string(),
  companyName: z.string().nullish(),
  vatCode: z.string().nullish(),
  taxCode: z.string().nullish(),
  address: z
    .object({
      registeredOffice: z.object({ town: z.string().nullish() }).nullish(),
    })
    .nullish(),
  creationTimestamp: z.number().nullish(),
  lastUpdateTimestamp: z.number().nullish(),
});

// Enrichment "address" (verificato live): name + sede legale completa + gps.
// gps.coordinates è [lng, lat] (GeoJSON-style).
const openApiAddressSchema = z.object({
  toponym: z.string().nullish(),
  street: z.string().nullish(),
  streetNumber: z.string().nullish(),
  streetName: z.string().nullish(),
  town: z.string().nullish(),
  hamlet: z.string().nullish(),
  province: z.string().nullish(),
  zipCode: z.string().nullish(),
  gps: z.object({ coordinates: z.array(z.number()).nullish() }).nullish(),
  townCode: z.string().nullish(),
  region: z
    .object({
      code: z.string().nullish(),
      description: z.string().nullish(),
    })
    .nullish(),
});

const openApiAddressRecordSchema = openApiNameRecordSchema.extend({
  address: z
    .object({ registeredOffice: openApiAddressSchema.nullish() })
    .nullish(),
});

const itSearchResponseSchema = openApiEnvelopeSchema.extend({
  data: z.array(openApiNameRecordSchema).optional(),
});

const itSearchAddressResponseSchema = openApiEnvelopeSchema.extend({
  data: z.array(openApiAddressRecordSchema).optional(),
});

// /IT-marketing/{id} (verificato live): `data` è un OGGETTO singolo, non
// array. Subset dei campi utili alla scheda azienda — la response completa
// ha anche branches, NACE/SIC, bilancio dettagliato, soci, statistiche
// contratti, social, allOffices.
const openApiMarketingSchema = z.object({
  pec: z.string().nullish(),
  companyDetails: z
    .object({
      companyName: z.string().nullish(),
      vatCode: z.string().nullish(),
      taxCode: z.string().nullish(),
      reaCode: z.string().nullish(),
    })
    .nullish(),
  companyStatus: z
    .object({
      activityStatus: z
        .object({
          code: z.string().nullish(),
          description: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish(),
  address: z
    .object({
      streetName: z.string().nullish(),
      zipCode: z.string().nullish(),
      town: z.string().nullish(),
      province: z
        .object({
          code: z.string().nullish(),
          description: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish(),
  atecoClassification: z
    .object({
      ateco: z
        .object({
          code: z.string().nullish(),
          description: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish(),
  ecofin: z
    .object({
      turnover: z.number().nullish(),
      netWorth: z.number().nullish(),
      employees: z.number().nullish(),
    })
    .nullish(),
  employees: z.object({ employee: z.number().nullish() }).nullish(),
  mail: z.object({ email: z.string().nullish() }).nullish(),
  contacts: z
    .object({
      telephoneNumber: z.string().nullish(),
      fax: z.string().nullish(),
    })
    .nullish(),
  webAndSocial: z
    .object({
      website: z.string().nullish(),
      facebook: z.string().nullish(),
      linkedin: z.string().nullish(),
    })
    .nullish(),
});

const itMarketingResponseSchema = openApiEnvelopeSchema.extend({
  data: openApiMarketingSchema.nullish(),
});

// dryRun verificato live su sandbox: {data: [], count, cost, success, ...} —
// `count` = record match, `cost` = prezzo stimato in € per il fetch completo.
const itSearchDryRunResponseSchema = openApiEnvelopeSchema.extend({
  count: z.number(),
  cost: z.number(),
});

export type OpenApiNameRecord = z.infer<typeof openApiNameRecordSchema>;
export type ItSearchResponse = z.infer<typeof itSearchResponseSchema>;

// ---------------------------------------------------------------------------
// Call — fetch con Bearer + timeout; l'unico punto di uscita verso la rete.
// ---------------------------------------------------------------------------

async function fetchOpenApi(
  path: string,
  params: Record<string, string>,
): Promise<unknown> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${env.OPENAPI_TOKEN ?? ""}` },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    // DOMException non serializza (come in serpapi.ts) → Error normale.
    if (e instanceof DOMException) {
      throw new Error("Openapi request timed out");
    }
    throw e;
  }
  if (!res.ok) {
    // Errori → stesso envelope: {success:false, message, error} (es. 422
    // su townCode invalido → "invalid townCode", error 314).
    let detail = "";
    try {
      const parsed = openApiEnvelopeSchema.safeParse(await res.json());
      if (parsed.success) {
        detail = `: ${parsed.data.message ?? `error ${parsed.data.error}`}`;
      }
    } catch {
      // body non JSON → solo status
    }
    throw new Error(`Openapi HTTP ${res.status}${detail}`);
  }
  // 204 = nessun record (verificato su sandbox): body vuoto → null.
  if (res.status === 204) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Repo — /IT-search con dataEnrichment=name + dryRun per il conteggio.
// ---------------------------------------------------------------------------

export enum OpenApiActivityStatus {
  Attiva = "ATTIVA",
  Cessata = "CESSATA",
  Registrata = "REGISTRATA",
  Inattiva = "INATTIVA",
  Sospesa = "SOSPESA",
  InIscrizione = "IN_ISCRIZIONE",
}

export interface OpenApiCompanySearchInput {
  /** Ragione sociale (parole intere o `*` wildcard, min 3 char) → companyName */
  companyName?: string;
  /** Codice catastale/Belfiore del comune ("H501" = Roma) → townCode — filtro ESATTO */
  townCode?: string;
  /** Sigla provincia ("TO") → province */
  province?: string;
  /** Codice ATECO 2025 → atecoCode */
  atecoCode?: string;
  /** Union di letterali dall'enum → assegnabile direttamente dagli input zod. */
  activityStatus?: `${OpenApiActivityStatus}`;
  /** Offset paginazione → skip */
  skip?: number;
  /** Record per call (≤1000 — in prod il costo è per record!) → limit */
  limit?: number;
  /** Solo per `countCompaniesOpenApi`: l'enrichment scelto cambia il prezzo stimato. */
  dataEnrichment?:
    | "name"
    | "address"
    | "pec"
    | "shareholders"
    | "start"
    | "advanced";
}

export interface OpenApiCompanyResult {
  /** ID interno Openapi — external_id su DB, chiave dedupe. */
  externalId: string;
  name?: string;
  vatCode?: string;
  taxCode?: string;
  /** Comune della sede legale. */
  town?: string;
  lastUpdateTimestamp?: number;
}

function toQueryParams(
  input: OpenApiCompanySearchInput,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (input.companyName) params.companyName = input.companyName;
  if (input.townCode) params.townCode = input.townCode;
  if (input.province) params.province = input.province;
  if (input.atecoCode) params.atecoCode = input.atecoCode;
  if (input.activityStatus) params.activityStatus = input.activityStatus;
  if (input.skip !== undefined) params.skip = String(input.skip);
  if (input.limit !== undefined) params.limit = String(input.limit);
  return params;
}

function assertSuccess(response: {
  success: boolean;
  message?: string;
  error?: number | null;
}) {
  if (!response.success) {
    throw new Error(
      `Openapi IT-search: ${response.message ?? `error ${response.error}`}`,
    );
  }
}

/** Conteggio + prezzo stimato — dryRun, gratis (entro 100 call/gg in prod). */
export async function countCompaniesOpenApi(
  input: OpenApiCompanySearchInput,
): Promise<{ count: number; cost: number }> {
  const raw = await fetchOpenApi("/IT-search", {
    ...toQueryParams(input),
    // Stesso enrichment della search → il prezzo tornato è quello reale.
    dataEnrichment: input.dataEnrichment ?? "name",
    dryRun: "1",
  });
  const response = itSearchDryRunResponseSchema.parse(
    raw ?? { success: true, count: 0, cost: 0 },
  );
  assertSuccess(response);
  return { count: response.count, cost: response.cost };
}

/** Aziende per filtri strutturati → /IT-search dataEnrichment=name. */
export async function searchCompaniesOpenApi(
  input: OpenApiCompanySearchInput,
): Promise<OpenApiCompanyResult[]> {
  const raw = await fetchOpenApi("/IT-search", {
    ...toQueryParams(input),
    dataEnrichment: "name",
  });
  const response = itSearchResponseSchema.parse(
    raw ?? { success: true, data: [] },
  );
  assertSuccess(response);
  return (response.data ?? []).map(
    (c): OpenApiCompanyResult => ({
      externalId: c.id,
      name: c.companyName ?? undefined,
      vatCode: c.vatCode ?? undefined,
      taxCode: c.taxCode ?? undefined,
      town: c.address?.registeredOffice?.town ?? undefined,
      lastUpdateTimestamp: c.lastUpdateTimestamp ?? undefined,
    }),
  );
}

export interface OpenApiCompanyAddressResult extends OpenApiCompanyResult {
  /** Indirizzo sede legale formattato (streetName) → `address` sulla card. */
  address?: string;
  zipCode?: string;
  province?: string;
  /** Coordinate sede — gps.coordinates è [lng, lat] → mappa. */
  lat?: number;
  lon?: number;
}

/** Search con sede legale completa + gps → card con indirizzo e pin mappa. */
export async function searchCompaniesAddressOpenApi(
  input: OpenApiCompanySearchInput,
): Promise<OpenApiCompanyAddressResult[]> {
  const raw = await fetchOpenApi("/IT-search", {
    ...toQueryParams(input),
    dataEnrichment: "address",
  });
  const response = itSearchAddressResponseSchema.parse(
    raw ?? { success: true, data: [] },
  );
  assertSuccess(response);
  return (response.data ?? []).map((c): OpenApiCompanyAddressResult => {
    const ro = c.address?.registeredOffice;
    const coords = ro?.gps?.coordinates;
    return {
      externalId: c.id,
      name: c.companyName ?? undefined,
      vatCode: c.vatCode ?? undefined,
      taxCode: c.taxCode ?? undefined,
      town: ro?.town ?? undefined,
      address: ro?.streetName ?? undefined,
      zipCode: ro?.zipCode ?? undefined,
      province: ro?.province ?? undefined,
      lon: coords?.[0],
      lat: coords?.[1],
      lastUpdateTimestamp: c.lastUpdateTimestamp ?? undefined,
    };
  });
}

export type OpenApiCompanyMarketing = z.infer<typeof openApiMarketingSchema>;

/**
 * Deep dive on demand su UNA azienda → /IT-marketing/{piva|cf|id}.
 * In prod 0,20€/call (0,085 in abbonamento) — da invocare solo su click
 * "Dettagli", mai in batch.
 */
export async function getCompanyMarketingOpenApi(
  id: string,
): Promise<OpenApiCompanyMarketing | null> {
  const raw = await fetchOpenApi(`/IT-marketing/${encodeURIComponent(id)}`, {});
  const response = itMarketingResponseSchema.parse(
    raw ?? { success: true, data: null },
  );
  assertSuccess(response);
  return response.data ?? null;
}
