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
