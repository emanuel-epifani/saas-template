export const JOB_EXAMPLES = [
  { term: "magazziniere", city: "Milano" },
  { term: "operaio", city: "Torino" },
  { term: "addetto vendite", city: "Roma" },
] as const;

export function jobOffersSearchHref(params: {
  term: string;
  city: string;
}): string {
  const q = new URLSearchParams({
    term: params.term,
    city: params.city,
  });
  return `/job-offers?${q.toString()}`;
}
