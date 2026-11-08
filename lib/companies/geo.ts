import { COMUNI, type ComuneRow } from "./comuni";
import { COMUNI_BBOX, type ComuneBbox } from "./comuni-bbox";

/*
 * Geo helpers per la ricerca per comune.
 *   - resolveComune: nome o codice catastale → bbox
 *   - expandBbox:    bbox + raggio (km) → bbox più grande
 *   - bboxToRectangle: bbox → rettangolo Places (angolo SW + NE)
 *
 * Il bbox viene da COMUNI_BBOX (generato dai confini reali), quindi è
 * l'estensione vera del comune — non un raggio arbitrario dal centroide.
 */

export interface ResolvedComune {
  /** Nome canonico da COMUNI (maiuscolo). */
  name: string;
  /** Codice catastale — chiave di COMUNI_BBOX. */
  code: string;
  /** Sigla provincia. */
  prov: string;
  bbox: ComuneBbox;
}

// Indici costruiti una volta a load: 7.896 righe, lookup O(1).
const BY_NAME = new Map<string, ComuneRow>();
const BY_CODE = new Map<string, ComuneRow>();
for (const row of COMUNI) {
  BY_NAME.set(row[0], row);
  BY_CODE.set(row[1], row);
}

/** Risolve un comune per nome (case-insensitive) o codice catastale. */
export function resolveComune(input: string): ResolvedComune | undefined {
  const q = input.trim().toUpperCase();
  const row = BY_NAME.get(q) ?? BY_CODE.get(q);
  if (!row) return undefined;
  const bbox = COMUNI_BBOX[row[1]];
  if (!bbox) return undefined;
  return { name: row[0], code: row[1], prov: row[2], bbox };
}

/** Bbox → rettangolo Places: angolo SW (`low`) + NE (`high`). */
export function bboxToRectangle(bbox: ComuneBbox): {
  low: { lat: number; lon: number };
  high: { lat: number; lon: number };
} {
  const [minLat, minLon, maxLat, maxLon] = bbox;
  return {
    low: { lat: minLat, lon: minLon },
    high: { lat: maxLat, lon: maxLon },
  };
}
