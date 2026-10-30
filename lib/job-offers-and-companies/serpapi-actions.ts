"use server";

/*
 * RPC boundary verso SerpApi — UNICO file "use server" del provider.
 * Ogni export è un endpoint POST pubblico: qui si valida l'input (zod)
 * e si delega al repository, che restituisce dati già normalizzati.
 * Solo async function exportabili — schemi/tipi in ./serpapi-schemas.
 */

import { headers } from "next/headers";

import { auth } from "@/lib/auth/server";

import { searchCompany, searchJobOffer } from "./serpapi";
import {
  type CompanySearchResult,
  companySearchInputSchema,
  type JobOfferResult,
  jobOfferSearchInputSchema,
} from "./serpapi-schemas";

// Gli endpoint sono pubblici: il guard di (protected)/layout copre solo le
// pagine. Ogni action verifica la sessione prima di spendere crediti SerpApi.
async function requireAuth(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
}

export async function findCompanies(
  input: unknown,
): Promise<CompanySearchResult> {
  await requireAuth();
  const params = companySearchInputSchema.parse(input);
  return searchCompany(params);
}

export async function findJobOffers(input: unknown): Promise<JobOfferResult[]> {
  await requireAuth();
  const params = jobOfferSearchInputSchema.parse(input);
  return searchJobOffer(params);
}
