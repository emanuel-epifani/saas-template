import { texts } from "@/texts";

// Opzioni raggio (km) → la select invia km, il repo li converte in zoom `ll`.
export const RADIUS_OPTIONS = [
  { km: 2, label: texts.radiusCenterOption },
  { km: 5, label: "~5 km" },
  { km: 10, label: "~10 km" },
  { km: 20, label: "~20 km" },
] as const;

export const DEFAULT_RADIUS = 5;

export function parseRadius(v: string | null): number {
  const km = Number(v);
  return RADIUS_OPTIONS.some((o) => o.km === km) ? km : DEFAULT_RADIUS;
}

export function companiesSearchHref(params: {
  term: string;
  city: string;
  radius: number;
}): string {
  const q = new URLSearchParams({
    term: params.term,
    city: params.city,
    radius: String(params.radius),
  });
  return `/companies?${q.toString()}`;
}
