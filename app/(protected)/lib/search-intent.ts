// One-shot "the user just asked for this search" flag. Module state lives per
// tab across client navigations and is gone on reload / new tab / shared link —
// exactly the cases where we must NOT spend a paid SerpAPI call.
let intent: string | null = null;

export function markSearchIntent(href: string) {
  intent = href;
}

export function consumeSearchIntent(href: string): boolean {
  const ok = intent === href;
  intent = null;
  return ok;
}
