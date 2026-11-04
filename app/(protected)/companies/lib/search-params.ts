export const COMPANY_EXAMPLES = [
  { term: "metalmeccaniche", city: "Torino" },
  { term: "logistica", city: "Milano" },
  { term: "ristorazione", city: "Bologna" },
] as const;

export function companiesSearchHref(params: {
  term: string;
  city: string;
}): string {
  const q = new URLSearchParams({
    term: params.term,
    city: params.city,
  });
  return `/companies?${q.toString()}`;
}
