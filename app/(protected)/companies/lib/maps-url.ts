// Official Google Maps URLs (https://developers.google.com/maps/documentation/urls/get-started):
// free, no key. destination_place_id pins the exact business; destination is required alongside it.
export function mapsDirectionsUrl(c: {
  name: string;
  address?: string;
  placeId?: string;
}): string {
  const q = new URLSearchParams({
    api: "1",
    destination: [c.name, c.address].filter(Boolean).join(", "),
  });
  if (c.placeId) q.set("destination_place_id", c.placeId);
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}
