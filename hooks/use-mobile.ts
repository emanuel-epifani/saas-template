import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

// useSyncExternalStore, not useState+useEffect: the server snapshot (false)
// is also what React uses while hydrating, so streamed Suspense content
// matches the SSR markup even if the viewport is mobile — the Sheet only
// swaps in after hydration, as a normal re-render.
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );
}
