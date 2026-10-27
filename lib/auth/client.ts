import { createAuthClient } from "better-auth/react";

// Browser client: defaults to the current origin, so no env var is needed.
// auth.api.* (server) lives in lib/auth/server.ts — this is for client components.
export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
