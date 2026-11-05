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

const itSearchResponseSchema = openApiEnvelopeSchema.extend({
  data: z.array(openApiNameRecordSchema).optional(),
});

// dryRun torna "numero di record e prezzo" (docs) ma la shape esatta non è
// nell'OAS → data unknown: verificare live in sandbox alla prima call.
const itSearchDryRunResponseSchema = openApiEnvelopeSchema.extend({
  data: z.unknown().optional(),
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
  if (!res.ok) throw new Error(`Openapi HTTP ${res.status}`);
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
  activityStatus?: OpenApiActivityStatus;
  /** Offset paginazione → skip */
  skip?: number;
  /** Record per call (≤1000 — in prod il costo è per record!) → limit */
  limit?: number;
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
): Promise<unknown> {
  const raw = await fetchOpenApi("/IT-search", {
    ...toQueryParams(input),
    // Stesso enrichment della search → il prezzo tornato è quello reale.
    dataEnrichment: "name",
    dryRun: "1",
  });
  const response = itSearchDryRunResponseSchema.parse(raw);
  assertSuccess(response);
  return response.data;
}

/** Aziende per filtri strutturati → /IT-search dataEnrichment=name. */
export async function searchCompaniesOpenApi(
  input: OpenApiCompanySearchInput,
): Promise<OpenApiCompanyResult[]> {
  const raw = await fetchOpenApi("/IT-search", {
    ...toQueryParams(input),
    dataEnrichment: "name",
  });
  const response = itSearchResponseSchema.parse(raw);
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
