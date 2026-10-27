import type { ReactNode } from "react";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth/session";

// Guard for every route inside (protected): one requireUser() for the whole
// segment instead of repeating it in each page. It runs on entry into the
// segment and on every router.refresh() (e.g. after sign-in/sign-out).
//
// The session read must NOT sit at the layout's top level: with
// cacheComponents it would hold the whole segment's prerendering. It lives
// in a component inside <Suspense>, evaluated when the page streams in.
// Authoritative checks in Server Actions still verify the session
// themselves — this guard is not a substitute for that.
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <SessionGuard>{children}</SessionGuard>
    </Suspense>
  );
}

async function SessionGuard({ children }: { children: ReactNode }) {
  await requireUser();
  return children;
}
