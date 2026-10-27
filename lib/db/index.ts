import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// The connection string is the only thing that changes between environments:
// local  -> the dockerized Postgres from docker-compose.yml
// prod   -> a pooled endpoint (Neon "-pooler" host, Supabase :6543, ...)
// Connection pooling for serverless happens server-side at that endpoint,
// not in this code — so the same driver works everywhere.
const connectionString = process.env.DATABASE_URL;

// Reuse the pool across HMR reloads in development.
const globalForDb = globalThis as unknown as { pool?: Pool };
const pool = globalForDb.pool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle({ client: pool, schema });
