import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/server";

// Every /api/auth/* endpoint (sign-in, sign-up, verify-email, session, ...)
// is owned by Better Auth. Your own mutations stay Server Actions — read the
// session there via auth.api.getSession + the nextCookies plugin.
export const { GET, POST } = toNextJsHandler(auth.handler);
