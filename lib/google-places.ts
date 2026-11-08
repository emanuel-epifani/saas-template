import { z } from "zod";

import { env } from "@/env";

import {
  bboxToRectangle,
  resolveComune,
  type ResolvedComune,
} from "./companies/geo";

/*
 * Google Places API (New) — provider parallelo a SerpApi, per confronto.
 *   - searchCompanyPlaces: 1 query per comune (bbox reale) → merge → filtro.
 *
 * Differenze chiave rispetto a SerpApi (lib/serpapi.ts):
 *   - `locationRestriction` è un vincolo DURO: nulla fuori dal rettangolo.
 *   - `addressComponents` porta il comune strutturato
 *     (administrative_area_level_3) → niente point-in-polygon nel caso comune.
 *   - `types[]` è un enum inglese stabile, non una stringa localizzata.
 *   - Cap: 60 risultati per query (3 pagine × 20) → oltre, tassellare.
 */

const BASE_URL = "https://places.googleapis.com/v1/places:searchText";
const PAGE_SIZE = 20;

// Field mask: Places restituisce SOLO i campi richiesti (e li fattura così).
// `addressComponents` è la ragione per cui questo provider esiste: contiene
// il comune, che SerpApi non espone in forma strutturata.
// `nextPageToken` va incluso ESPLICITAMENTE: il mask filtra l'intera
// risposta, non solo `places.*` — senza, la paginazione non arriva mai.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.types",
  "places.primaryType",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.addressComponents",
  "nextPageToken",
].join(",");

const addressComponentSchema = z.object({
  longText: z.string(),
  shortText: z.string().optional(),
  // Non sempre presente: alcuni componenti (es. country) arrivano senza.
  types: z.array(z.string()).optional(),
});

const placeSchema = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string() }),
  formattedAddress: z.string().optional(),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
  types: z.array(z.string()).optional(),
  primaryType: z.string().optional(),
  nationalPhoneNumber: z.string().optional(),
  websiteUri: z.string().optional(),
  addressComponents: z.array(addressComponentSchema).optional(),
});

const searchTextResponseSchema = z.object({
  places: z.array(placeSchema).optional(),
  nextPageToken: z.string().optional(),
});

export type PlacesAddressComponent = z.infer<typeof addressComponentSchema>;

// ---------------------------------------------------------------------------
// Forma pubblica (firma delle action, tipi per il client)
// ---------------------------------------------------------------------------

export interface PlacesCompanySearchInput {
  /** Tipo azienda libero ("torneria") → textQuery */
  term: string;
  /** Comuni richiesti (nomi o codici catastali) — 1 query per comune. */
  comuni: string[];
  /** Pagine max per comune (1-3, default 3 → fino a 60 risultati). */
  maxPages?: number;
}

export interface PlacesCompanyResult {
  /** Place ID — external_id, chiave dedupe + key React. */
  externalId: string;
  name: string;
  /** Tipo derivato: primaryType ?? types[0] ?? "altro". */
  type: string;
  /** Comune da addressComponents (administrative_area_level_3). */
  comune: string;
  /** Indirizzo formattato da Google — àncora di identità dell'azienda. */
  address: string;
  lat: number;
  lon: number;
  /** Provincia da addressComponents (administrative_area_level_2). */
  province?: string;
  phone?: string;
  website?: string;
}

export interface PlacesCompanySearchResult {
  companies: PlacesCompanyResult[];
  /** Comuni (nome uppercase) la cui query ha raggiunto il cap con pagine residue. */
  truncatedComuni: string[];
}

// ---------------------------------------------------------------------------
// Normalize
// ---------------------------------------------------------------------------

function componentOf(
  components: PlacesAddressComponent[] | undefined,
  type: string,
): string | undefined {
  return components?.find((c) => c.types?.includes(type))?.longText;
}

function normalizePlace(
  p: z.infer<typeof placeSchema>,
): PlacesCompanyResult | null {
  const comune = componentOf(p.addressComponents, "administrative_area_level_3");
  const address = p.formattedAddress;
  // Senza comune non possiamo filtrare; senza indirizzo non possiamo
  // identificare l'azienda. Scartiamo prima di costruire il risultato.
  if (!comune || !address) return null;
  return {
    externalId: p.id,
    name: p.displayName.text,
    type: p.primaryType ?? p.types?.[0] ?? "altro",
    comune,
    address,
    province: componentOf(p.addressComponents, "administrative_area_level_2"),
    phone: p.nationalPhoneNumber,
    website: p.websiteUri,
    lat: p.location.latitude,
    lon: p.location.longitude,
  };
}

function dedupeById(items: PlacesCompanyResult[]): PlacesCompanyResult[] {
  const seen = new Set<string>();
  return items.filter((x) => {
    if (seen.has(x.externalId)) return false;
    seen.add(x.externalId);
    return true;
  });
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function callSearchText(
  apiKey: string,
  {
    textQuery,
    rectangle,
    pageToken,
  }: {
    textQuery: string;
    rectangle: {
      low: { lat: number; lon: number };
      high: { lat: number; lon: number };
    };
    pageToken?: string;
  },
): Promise<z.infer<typeof searchTextResponseSchema>> {
  const body: Record<string, unknown> = {
    textQuery,
    languageCode: "it",
    regionCode: "IT",
    pageSize: PAGE_SIZE,
    locationRestriction: {
      rectangle: {
        low: { latitude: rectangle.low.lat, longitude: rectangle.low.lon },
        high: { latitude: rectangle.high.lat, longitude: rectangle.high.lon },
      },
    },
  };
  if (pageToken) body.pageToken = pageToken;

  let res: Response;
  try {
    res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    // DOMException: `message` getter-only → crasha la serializzazione
    // errori di Next. Rilancia come Error normale.
    if (e instanceof DOMException) {
      throw new Error("Google Places request timed out");
    }
    throw e;
  }

  if (!res.ok) {
    // Places torna il dettaglio dell'errore nel body: utile in sviluppo
    // (chiave non valida, API non abilitata, quota, campo non valido).
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Google Places HTTP ${res.status}: ${detail.slice(0, 400)}`,
    );
  }

  return searchTextResponseSchema.parse(await res.json());
}

// ---------------------------------------------------------------------------
// Repo
// ---------------------------------------------------------------------------

async function fetchComune(
  apiKey: string,
  term: string,
  comune: ResolvedComune,
  maxPages: number,
): Promise<{ places: PlacesCompanyResult[]; truncated: boolean }> {
  const rectangle = bboxToRectangle(comune.bbox);
  const out: PlacesCompanyResult[] = [];
  let rawCount = 0;
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const json = await callSearchText(apiKey, {
      textQuery: term,
      rectangle,
      pageToken,
    });
    for (const p of json.places ?? []) {
      rawCount++;
      const normalized = normalizePlace(p);
      if (normalized) out.push(normalized);
    }
    pageToken = json.nextPageToken;
    pages++;
  } while (pageToken && pages < maxPages);
  // Places NON restituisce un token oltre il cap di 60: dopo la terza pagina
  // il token sparisce anche se i risultati sono molti di più. L'unico segnale
  // affidabile è aver riempito tutte le pagine richieste. Il conteggio è
  // quello GREZZO: gli scarti di normalizePlace non devono falsare il cap.
  const truncated = Boolean(pageToken) || rawCount >= maxPages * PAGE_SIZE;
  return { places: out, truncated };
}

/**
 * Aziende per testo, una query per comune (bbox reale, senza espansione).
 * Filtro stretto: restano solo i risultati il cui comune è tra quelli
 * richiesti. Il bbox è solo lo scope della query — non è la verità.
 */
export async function searchCompanyPlaces({
  term,
  comuni,
  maxPages = 3,
}: PlacesCompanySearchInput): Promise<PlacesCompanySearchResult> {
  const apiKey = env.API_KEY_GOOGLE_PLACES;
  if (!apiKey) {
    throw new Error("API_KEY_GOOGLE_PLACES non configurata");
  }

  const resolved = comuni.map((input) => {
    const r = resolveComune(input);
    if (!r) throw new Error(`Comune non trovato: ${input}`);
    return r;
  });

  const assigned = new Set(resolved.map((r) => r.name));

  // Comuni in parallelo; le pagine DENTRO un comune restano sequenziali
  // (la pagina N+1 richiede il token della N).
  const perComune = await Promise.all(
    resolved.map((comune) => fetchComune(apiKey, term, comune, maxPages)),
  );
  const collected = perComune.flatMap((r) => r.places);

  // Filtro stretto: solo i comuni richiesti. Il bbox sconfina negli angoli,
  // quindi il comune da addressComponents è l'unica verità affidabile.
  const companies = dedupeById(collected).filter((c) =>
    assigned.has(c.comune.toUpperCase()),
  );

  // Il flag della query è per bbox, non per comune: il rettangolo di Ivrea
  // pesca anche i comuni vicini, che poi il filtro scarta. Un "+" su una chip
  // da 52 farebbe credere che Ivrea ne abbia altri, quando i mancanti sono
  // dei vicini. Quindi "+" solo se il comune ha saturato il cap da solo.
  const cap = maxPages * PAGE_SIZE;
  const countsByComune = new Map<string, number>();
  for (const c of companies) {
    const key = c.comune.toUpperCase();
    countsByComune.set(key, (countsByComune.get(key) ?? 0) + 1);
  }

  const truncatedComuni = resolved
    .filter(
      (r, i) =>
        perComune[i]?.truncated && (countsByComune.get(r.name) ?? 0) >= cap,
    )
    .map((r) => r.name);

  return { companies, truncatedComuni };
}
