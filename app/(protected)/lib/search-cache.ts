// Per-tab, in-memory: survives client navigation (back/forward, sidebar),
// cleared on reload.
export function createSearchCache<T>() {
  let entry: { href: string; state: T } | null = null;
  return {
    save(href: string, state: T) {
      entry = { href, state };
    },
    restore(href: string): T | null {
      return entry?.href === href ? entry.state : null;
    },
  };
}
