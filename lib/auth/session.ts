import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

// Data Access Layer for the session (cacheComponents pattern):
// `use cache: private` keeps the read out of the static shell while letting
// the browser cache it for prefetched navigations. Always consume it behind
// a <Suspense> boundary — reading cookies outside one is a build error.
export async function getSession() {
  "use cache: private";
  return await auth.api.getSession({ headers: await headers() });
}

// For signed-in-only surfaces: redirects to sign-in when there is no session.
export async function requireUser() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in");
  }
  return session.user;
}

// Per le Server Actions: il guard di (protected)/layout copre solo le pagine,
// gli endpoint RPC sono pubblici → qui si lancia, non si fa redirect.
// Non usa getSession ("use cache: private") perché nelle actions serve il
// read reale, non quella cachata per il rendering.
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
