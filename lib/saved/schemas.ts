/*
 * Saved schemas — input/output condivisi del dominio "archivio".
 * File NEUTRO: niente import server-only → sicuro per client bundle
 * (componenti che passano i payload alle action) e server.
 */

import { z } from "zod";

export const savedListKindSchema = z.enum(["company", "job"]);
export type SavedListKind = z.infer<typeof savedListKindSchema>;

// Colonna custom di una lista (registro Airtable-style): `key` è la chiave
// dentro item.extra, `label` è l'intestazione visibile in tabella.
export const extraColumnSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
});
export type ExtraColumn = z.infer<typeof extraColumnSchema>;

// Snapshot azienda salvata — specchio di CompanyResult (lib/companies/serpapi).
export const savedCompanyItemSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
});
export type SavedCompanyItem = z.infer<typeof savedCompanyItemSchema>;

// Snapshot offerta salvata — specchio di JobOfferResult (lib/job-offers/serpapi).
export const savedJobItemSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  companyName: z.string().min(1),
  location: z.string().min(1),
  via: z.string().min(1),
  description: z.string(),
  applyLink: z.string().min(1),
});
export type SavedJobItem = z.infer<typeof savedJobItemSchema>;

const listTarget = {
  /** Lista esistente — ha priorità se presente. */
  listId: z.string().uuid().optional(),
  /** Nome per una lista nuova (o riuso se esiste già con lo stesso nome). */
  listName: z.string().trim().min(1).max(80).optional(),
};

export const saveItemsInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("company"),
    ...listTarget,
    items: z.array(savedCompanyItemSchema).min(1).max(500),
  }),
  z.object({
    kind: z.literal("job"),
    ...listTarget,
    items: z.array(savedJobItemSchema).min(1).max(500),
  }),
]);

export const myListsInputSchema = z.object({
  kind: savedListKindSchema.optional(),
});

export const listIdInputSchema = z.object({
  listId: z.string().uuid(),
});

export const renameListInputSchema = z.object({
  listId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
});

export const addColumnInputSchema = z.object({
  listId: z.string().uuid(),
  label: z.string().trim().min(1).max(40),
});

export const deleteItemInputSchema = z.object({
  kind: savedListKindSchema,
  itemId: z.string().uuid(),
});

export const updateItemInputSchema = z.object({
  kind: savedListKindSchema,
  itemId: z.string().uuid(),
  notes: z.string().max(8000).nullable().optional(),
  /** Sostituzione completa del blob extra (il client fonde le chiavi). */
  extra: z.record(z.string().max(40), z.string().max(2000)).optional(),
});
