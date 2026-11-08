// Genera public/comuni.txt da lib/companies/comuni.ts (unica fonte).
// Formato: Nome|PROV per riga. Rilanciare quando comuni.ts cambia.
// Uso: node scripts/gen-comuni-txt.mjs

import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("lib/companies/comuni.ts", "utf8");
const re = /\["([^"]+)", "[^"]+", "([^"]+)"\]/g;

const lines = [];
for (const m of src.matchAll(re)) {
  lines.push(`${m[1]}|${m[2]}`);
}

writeFileSync("public/comuni.txt", `${lines.join("\n")}\n`);
console.log(`public/comuni.txt: ${lines.length} righe`);
