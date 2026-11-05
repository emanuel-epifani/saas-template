/*
 * DB queries — l'UNICO modulo dentro lib/db/ importabile dalla presentation
 * (RSC) e dalle action. Tutto l'accesso ai dati dell'app vive qui.
 * MAI "use server": le action in lib/actions.ts fanno da boundary RPC
 * (sessione + zod) prima di chiamare qui. I client component possono
 * importare solo i tipi (`import type`), mai il modulo a runtime.
 */

import { and, count, desc, eq, inArray } from "drizzle-orm";

import type {
  ExtraColumn,
  SavedCompanyItem,
  SavedJobItem,
  SavedListKind,
} from "../zod-schemas";
import { db } from "./index";
import { savedCompany, savedJobOffer, savedList } from "./schema";

export type SavedListRow = typeof savedList.$inferSelect;
export type SavedCompanyRow = typeof savedCompany.$inferSelect;
export type SavedJobOfferRow = typeof savedJobOffer.$inferSelect;

export interface SavedListWithCount extends SavedListRow {
  itemCount: number;
}

/** Liste dell'utente con conteggio item, più recenti prima. */
export async function findListsByUser(
  userId: string,
): Promise<SavedListWithCount[]> {
  const lists = await db
    .select()
    .from(savedList)
    .where(eq(savedList.userId, userId))
    .orderBy(desc(savedList.updatedAt));
  if (lists.length === 0) return [];

  const ids = lists.map((l) => l.id);
  const [companyCounts, jobCounts] = await Promise.all([
    db
      .select({ listId: savedCompany.listId, n: count() })
      .from(savedCompany)
      .where(inArray(savedCompany.listId, ids))
      .groupBy(savedCompany.listId),
    db
      .select({ listId: savedJobOffer.listId, n: count() })
      .from(savedJobOffer)
      .where(inArray(savedJobOffer.listId, ids))
      .groupBy(savedJobOffer.listId),
  ]);
  const counts = new Map(
    [...companyCounts, ...jobCounts].map((r) => [r.listId, r.n]),
  );
  return lists.map((l) => ({ ...l, itemCount: counts.get(l.id) ?? 0 }));
}

/** Lista per id SOLO se appartiene all'utente — check di ownership base. */
export async function findListForUser(listId: string, userId: string) {
  const rows = await db
    .select()
    .from(savedList)
    .where(and(eq(savedList.id, listId), eq(savedList.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Item di una lista aziende. createdAt+id: chiavi immutabili → ordine
 *  stabile anche dopo UPDATE (i batch insert hanno createdAt identico,
 *  l'uuid rompe i pari merito in modo deterministico). */
export async function findCompanyItems(listId: string) {
  return db
    .select()
    .from(savedCompany)
    .where(eq(savedCompany.listId, listId))
    .orderBy(savedCompany.createdAt, savedCompany.id);
}

/** Item di una lista offerte — vedi findCompanyItems. */
export async function findJobItems(listId: string) {
  return db
    .select()
    .from(savedJobOffer)
    .where(eq(savedJobOffer.listId, listId))
    .orderBy(savedJobOffer.createdAt, savedJobOffer.id);
}

/** Crea la lista o riusa quella con lo stesso nome (unique user+kind+name). */
export async function createOrGetList(
  userId: string,
  kind: SavedListKind,
  name: string,
) {
  const inserted = await db
    .insert(savedList)
    .values({ userId, kind, name })
    .onConflictDoNothing({
      target: [savedList.userId, savedList.kind, savedList.name],
    })
    .returning();
  if (inserted[0]) return inserted[0];
  const existing = await db
    .select()
    .from(savedList)
    .where(
      and(
        eq(savedList.userId, userId),
        eq(savedList.kind, kind),
        eq(savedList.name, name),
      ),
    )
    .limit(1);
  return existing[0] ?? null;
}

/** Tocca list.updatedAt: l'ultima attività sulla lista vale per l'ordinamento. */
async function touchList(listId: string) {
  await db
    .update(savedList)
    .set({ updatedAt: new Date() })
    .where(eq(savedList.id, listId));
}

/** Upsert idempotente: item già presenti (stesso externalId) restano intatti. */
export async function insertCompanies(
  listId: string,
  items: SavedCompanyItem[],
) {
  const inserted = await db
    .insert(savedCompany)
    .values(items.map((i) => ({ ...i, listId })))
    .onConflictDoNothing({
      target: [savedCompany.listId, savedCompany.externalId],
    })
    .returning({ id: savedCompany.id });
  if (inserted.length > 0) await touchList(listId);
  return inserted.length;
}

export async function insertJobOffers(listId: string, items: SavedJobItem[]) {
  const inserted = await db
    .insert(savedJobOffer)
    .values(items.map((i) => ({ ...i, listId })))
    .onConflictDoNothing({
      target: [savedJobOffer.listId, savedJobOffer.externalId],
    })
    .returning({ id: savedJobOffer.id });
  if (inserted.length > 0) await touchList(listId);
  return inserted.length;
}

async function ownsItem(
  kind: SavedListKind,
  itemId: string,
  userId: string,
): Promise<boolean> {
  if (kind === "company") {
    const rows = await db
      .select({ id: savedCompany.id })
      .from(savedCompany)
      .innerJoin(savedList, eq(savedCompany.listId, savedList.id))
      .where(and(eq(savedCompany.id, itemId), eq(savedList.userId, userId)))
      .limit(1);
    return rows.length > 0;
  }
  const rows = await db
    .select({ id: savedJobOffer.id })
    .from(savedJobOffer)
    .innerJoin(savedList, eq(savedJobOffer.listId, savedList.id))
    .where(and(eq(savedJobOffer.id, itemId), eq(savedList.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function updateItemForUser(
  kind: SavedListKind,
  itemId: string,
  userId: string,
  patch: { notes?: string | null; extra?: Record<string, string> },
) {
  if (!(await ownsItem(kind, itemId, userId))) return false;
  if (kind === "company") {
    await db.update(savedCompany).set(patch).where(eq(savedCompany.id, itemId));
  } else {
    await db
      .update(savedJobOffer)
      .set(patch)
      .where(eq(savedJobOffer.id, itemId));
  }
  return true;
}

export async function deleteItemForUser(
  kind: SavedListKind,
  itemId: string,
  userId: string,
) {
  if (!(await ownsItem(kind, itemId, userId))) return false;
  if (kind === "company") {
    await db.delete(savedCompany).where(eq(savedCompany.id, itemId));
  } else {
    await db.delete(savedJobOffer).where(eq(savedJobOffer.id, itemId));
  }
  return true;
}

export async function renameListForUser(
  listId: string,
  userId: string,
  name: string,
) {
  const updated = await db
    .update(savedList)
    .set({ name })
    .where(and(eq(savedList.id, listId), eq(savedList.userId, userId)))
    .returning({ id: savedList.id });
  return updated.length > 0;
}

/** Cancella lista + item (cascade). Solo se dell'utente. */
export async function deleteListForUser(listId: string, userId: string) {
  const deleted = await db
    .delete(savedList)
    .where(and(eq(savedList.id, listId), eq(savedList.userId, userId)))
    .returning({ id: savedList.id });
  return deleted.length > 0;
}

/** Accoda una colonna al registro della lista (read-modify-write, per-user). */
export async function appendColumn(listId: string, columns: ExtraColumn[]) {
  await db.update(savedList).set({ columns }).where(eq(savedList.id, listId));
}
