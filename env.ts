import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Single source of truth for env vars — validated on import, the app
// crashes on missing/invalid values. Use `env.X`, never `process.env.X`.
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  emptyStringAsUndefined: true,
});
