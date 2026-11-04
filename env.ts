import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Single source of truth for env vars — validated on import, the app
// crashes on missing/invalid values. Use `env.X`, never `process.env.X`.
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    // Optional: without it, auth emails are printed to the server console.
    RESEND_API_KEY: z.string().startsWith("re_").optional(),
    // Sender identity, e.g. "My App <app@yourdomain.com>". In dev,
    // "Onboarding <onboarding@resend.dev>" works without a verified domain.
    EMAIL_FROM: z.string().min(3),
    // SerpApi — optional while mocked; required once SERPAPI_MOCK is off.
    API_KEY_SERPAPI: z.string(),
    // "false" = real calls (consume credits). Missing/unset = mock ON.
    SERPAPI_MOCK: z.enum(["true", "false"]).default("true"),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    API_KEY_SERPAPI: process.env.API_KEY_SERPAPI,
    SERPAPI_MOCK: process.env.SERPAPI_MOCK,
  },
  emptyStringAsUndefined: true,
});
