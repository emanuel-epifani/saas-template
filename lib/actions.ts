"use server";

/*
 * RPC boundary — l'intera superficie pubblica dell'app.
 * Ogni export è un endpoint POST pubblico: sessione + zod + ownership
 * verificati qui dentro, mai fidarsi del client. Regola Next: solo async
 * function exportabili → gli schema zod stanno in ./zod-schemas (neutro).
 * refresh() ri-renderizza la route corrente nella stessa response →
 * i componenti client non devono rifare fetch dopo una mutazione.
 */

import { refresh, revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";

import {
  countCompaniesOpenApi,
  getCompanyMarketingOpenApi,
  searchCompaniesOpenApi,
} from "./companies/openapi";
import * as repo from "./db/queries";
import { searchCompany, searchJobOffer } from "./serpapi";
import {
  addColumnInputSchema,
  companySearchInputSchema,
  deleteItemInputSchema,
  jobOfferSearchInputSchema,
  listIdInputSchema,
  myListsInputSchema,
  openApiCompanyIdInputSchema,
  openApiCompanySearchInputSchema,
  renameListInputSchema,
  saveItemsInputSchema,
  updateItemInputSchema,
} from "./zod-schemas";

// -- Search (SerpApi) — sessione + zod prima di spendere crediti -----------

export async function findCompanies(input: unknown) {
  await requireSession();
  return searchCompany(companySearchInputSchema.parse(input));
}

export async function findJobOffers(input: unknown) {
  //todo: why I don't see any date of publish of job offer? deep dive payload
  await requireSession();
  return searchJobOffer(jobOfferSearchInputSchema.parse(input));
}

// -- Search (OpenApi Company) — dryRun gratis, poi fetch a pagamento ---------

export async function estimateOpenApiCompanies(input: unknown) {
  await requireSession();
  return countCompaniesOpenApi(openApiCompanySearchInputSchema.parse(input));
}

export async function searchOpenApiCompanies(input: unknown) {
  await requireSession();
  return searchCompaniesOpenApi(openApiCompanySearchInputSchema.parse(input));
}

export async function getOpenApiCompany(input: unknown) {
  await requireSession();
  const { id } = openApiCompanyIdInputSchema.parse(input);
  return getCompanyMarketingOpenApi(id);
}

// -- Saved (archivio utente) ------------------------------------------------

export async function getMyLists(input: unknown) {
  const session = await requireSession();
  const { kind } = myListsInputSchema.parse(input ?? {});
  const lists = await repo.findListsByUser(session.user.id);
  return kind ? lists.filter((l) => l.kind === kind) : lists;
}

export async function saveToList(input: unknown) {
  const session = await requireSession();
  const parsed = saveItemsInputSchema.parse(input);

  let listId = parsed.listId;
  if (listId) {
    const list = await repo.findListForUser(listId, session.user.id);
    if (!list || list.kind !== parsed.kind) throw new Error("Lista non valida");
  } else {
    const name = parsed.listName?.trim();
    if (!name) throw new Error("Nome lista mancante");
    const list = await repo.createOrGetList(session.user.id, parsed.kind, name);
    if (!list) throw new Error("Salvataggio non riuscito");
    listId = list.id;
  }

  const inserted =
    parsed.kind === "company"
      ? await repo.insertCompanies(listId, parsed.items)
      : await repo.insertJobOffers(listId, parsed.items);
  return { listId, inserted, total: parsed.items.length };
}

export async function updateSavedItem(input: unknown) {
  const session = await requireSession();
  const { kind, itemId, notes, extra } = updateItemInputSchema.parse(input);
  const ok = await repo.updateItemForUser(kind, itemId, session.user.id, {
    notes,
    extra,
  });
  if (!ok) throw new Error("Elemento non trovato");
  refresh();
}

export async function deleteSavedItem(input: unknown) {
  const session = await requireSession();
  const { kind, itemId } = deleteItemInputSchema.parse(input);
  const ok = await repo.deleteItemForUser(kind, itemId, session.user.id);
  if (!ok) throw new Error("Elemento non trovato");
  refresh();
}

export async function renameSavedList(input: unknown) {
  const session = await requireSession();
  const { listId, name } = renameListInputSchema.parse(input);
  const ok = await repo.renameListForUser(listId, session.user.id, name);
  if (!ok) throw new Error("Lista non trovata");
  refresh();
}

export async function addSavedColumn(input: unknown) {
  const session = await requireSession();
  const { listId, label } = addColumnInputSchema.parse(input);
  const list = await repo.findListForUser(listId, session.user.id);
  if (!list) throw new Error("Lista non trovata");

  const key = columnKey(label);
  if (list.columns.some((c) => c.key === key)) {
    throw new Error("Colonna già presente");
  }
  await repo.appendColumn(listId, [...list.columns, { key, label }]);
  refresh();
}

export async function deleteSavedList(input: unknown) {
  const session = await requireSession();
  const { listId } = listIdInputSchema.parse(input);
  const ok = await repo.deleteListForUser(listId, session.user.id);
  if (!ok) throw new Error("Lista non trovata");
  revalidatePath("/saved");
  refresh();
}

// "P.IVA / C.F." → "p_iva_c_f": chiave stabile per item.extra.
// Accenti normalizzati via NFD; fallback se la label è solo simboli.
function columnKey(label: string) {
  const key = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key || "campo";
}
