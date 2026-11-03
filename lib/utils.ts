export { cn } from "cn";

/** "https://www.acme.it/path" → "acme.it" — hostname only, no protocol/www. */
export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] ?? url;
  }
}
