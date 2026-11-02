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
