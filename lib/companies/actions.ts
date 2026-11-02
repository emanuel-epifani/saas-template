"use server";

/*
 * RPC boundary companies — ogni export è un endpoint POST pubblico:
 * verifica la sessione e valida l'input (zod) prima di spendere crediti.
 * Regola Next: solo async function exportabili → lo schema zod è interno.
 */

import { z } from "zod";

import { requireSession } from "@/lib/auth/session";

import { searchCompany } from "./serpapi";

const companySearchInputSchema = z.object({
  /** Tipo azienda libero ("pizzeria") → q */
  term: z.string().min(1),
  /** Città libera ("Grugliasco") → geocoding → ll */
  city: z.string().min(1),
  /** Offset per il load more (0, 20, 40…) → start */
  start: z.number().int().min(0).default(0),
  /** Raggio dell'area in km → convertito in zoom di ll */
  radius: z.number().min(1).max(50).default(5),
});

export async function findCompanies(input: unknown) {
  await requireSession();
  return searchCompany(companySearchInputSchema.parse(input));
}
