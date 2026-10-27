import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Example table — replace with your real schema, then run
// `npm run db:generate` to create the migration and `npm run db:migrate`
// to apply it.
export const example = pgTable("example", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
