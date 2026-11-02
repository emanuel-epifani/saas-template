"use server";

/*
 * RPC boundary job offers — ogni export è un endpoint POST pubblico:
 * verifica la sessione e valida l'input (zod) prima di spendere crediti.
 * Regola Next: solo async function exportabili → lo schema zod è interno.
 */

import { z } from "zod";

import { requireSession } from "@/lib/auth/session";

import { searchJobOffer } from "./serpapi";

const jobOfferSearchInputSchema = z.object({
  /** Ruolo libero ("pizzaiolo") → q */
  term: z.string().min(1),
  /** Città libera ("Collegno") → location */
  city: z.string().min(1),
  /** Token della pagina successiva (load more) → next_page_token */
  nextPageToken: z.string().optional(),
});

export async function findJobOffers(input: unknown) {
  //todo: why I don't see any date of publish of job offer? deep dive payload
  await requireSession();
  return searchJobOffer(jobOfferSearchInputSchema.parse(input));
}
