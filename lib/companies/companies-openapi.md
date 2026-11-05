# Openapi Company — ricerca aziende Italia

Appunti per valutare la sostituzione/affiancamento di SerpAPI `google_maps`
nella ricerca aziende. Fonti: `console.openapi.com` (docs, OAS `company.openapi.json`,
pricing), `openapi.it/prodotti`, termini d'uso (`legal.openapi.com`
→ term-and-condition-general-it.pdf, art. 11 "Servizi Dati").

## TL;DR

Un solo endpoint di ricerca: `GET /IT-search`. **Non esiste free-text
"cosa + dove" come Google**: i filtri sono strutturati e il risultato è un
sottoinsieme esatto del registro imprese → zero risultati fuori comune,
dati ufficiali Camera di Commercio. Il costo è **per record restituito**,
in base al `dataEnrichment` scelto → `dryRun` (gratis) prima di ogni call.

## Ambienti e auth

| Env | Base URL | Costo |
| --- | --- | --- |
| Sandbox | `https://test.company.openapi.com` | gratis |
| Production | `https://company.openapi.com` | per record |

- **Auth**: `Authorization: Bearer <token>`. Il token si crea in
  console.openapi.com → sezione OAuth → New Token, assegnando gli scope
  (es. `GET:company.openapi.com/IT-search` per prod,
  `GET:test.company.openapi.com/IT-search` per sandbox). Creazione
  gratuita, TTL max 1 anno, limiti configurabili (richieste, wallet, IP).
- **Sandbox**: completamente gratuita, crediti finti regolabili a mano in
  console (si può anche simulare "credito esaurito"). Lista aziende di test:
  `docs.openapi.it/company-sandbox-examples.html`. Stessi payload della
  produzione → niente mock su file come per SerpAPI.
- Env vars previste: `OPENAPI_TOKEN` (bearer) + `OPENAPI_SANDBOX=false`
  solo per passare a production.

## GET /IT-search — parametri (da OAS)

| Param | Tipo | Note |
| --- | --- | --- |
| `townCode` | string | **Comune esatto = codice catastale/Belfiore** (es. `H501` = Roma) — il filtro "dove" preciso |
| `companyName` | string | **Ragione sociale**: parole intere oppure `*` wildcard (inizia/finisce/contiene, min 3 char). NON è la categoria né l'insegna del negozio |
| `autocomplete` | string | Prefix search su ragione sociale (per autocomplete UI) |
| `atecoCode` | string | Codice ATECO 2025 — è questo il "cosa" della ricerca |
| `province` | string | Sigla provincia (`TO`, `RM`…) |
| `lat` `long` `radius` | geo | Ricerca geografica, radius in metri |
| `activityStatus` | enum | `ATTIVA` `CESSATA` `REGISTRATA` `INATTIVA` `SOSPESA` `IN_ISCRIZIONE` |
| `cciaa` `reaCode` | string | Camera di Commercio / numero REA |
| `minTurnover` `maxTurnover` | int | Fascia di fatturato |
| `minEmployees` `maxEmployees` | int | Fascia dipendenti |
| `sdiCode` `legalFormCode` `pec` `shareHolderTaxCode` | string | Filtri puntuali (forma giuridica da `GET /IT-legalforms`) |
| `creationTimestamp` `lastUpdateTimestamp` | int | Solo aziende create/aggiornate dopo il timestamp |
| `dryRun` | 0/1 | Torna solo **conteggio record + prezzo** — gratis |
| `dataEnrichment` | enum | `start` `advanced` `pec` `address` `shareholders` `name` — vedi sotto |
| `skip` `limit` | int | Paginazione offset; `limit` ≤ 1000 (default 1000) |

Tutti i parametri sono opzionali e combinabili liberamente. Senza alcun
parametro torna la lista di soli `id`.

## dataEnrichment — contenuto e prezzo PER RECORD restituito

| `dataEnrichment` | €/record | Contenuto |
| --- | --- | --- |
| (assente) | 0,01/**call** dopo 100 free/gg | Solo `id` azienda |
| `name` | 0,001 | id, P.IVA, CF, ragione sociale, comune sede legale, timestamp |
| `address` | 0,010 | name + sede legale completa, **lat/lng**, `townCode` |
| `pec` | 0,030 | name + PEC attuale e storico |
| `shareholders` | 0,030 | name + soci >10% (nome/CF/quota) |
| `start` | 0,050 | name + sede, **activityStatus**, codice SdI, data iscrizione CCIAA |
| `advanced` | 0,100 | start + PEC, REA, forma giuridica, **ATECO, fatturato, utili, dipendenti, soci** |

Senza abbonamento = prezzo base da wallet. Con abbonamento allo specifico
dataset le call scalano dal piano.

## Endpoint singola azienda (`{piva|cf|id}`) — il "deep dive" on demand

| Endpoint | €/call | Contenuto |
| --- | --- | --- |
| `GET /IT-name` | 0,001 | id, P.IVA, CF, denominazione, comune |
| `GET /IT-address` | 0,010 | Indirizzo sede legale + gps |
| `GET /IT-pec` | 0,030 | PEC (da 0,015 in abbonamento) |
| `GET /IT-shareholders` | 0,030 | Soci e quote |
| `GET /IT-start` | 0,050 | Base + stato/SdI (da 0,015) |
| `GET /IT-advanced` | 0,100 | ATECO, fatturato, dipendenti, soci… (da 0,028) |
| `GET /IT-marketing` | 0,200 | **Telefono, email, fax, sito, social**, sedi secondarie, ATECO 2025+storico, NACE/SIC, fatturato, dipendenti, contratti (da 0,085 in abbonamento; anche async via POST + `GET /IT-check_id`) |
| `GET /IT-stakeholders` | 0,200 | Managers, soci, gruppi, collegate (da 0,086) |
| `GET /IT-aml` | 0,200 | Antiriciclaggio (da 0,086) |
| `GET /IT-full` | 0,300 | Tutto + bilancio completo (da 0,08) |
| `GET /IT-legalforms` | — | Elenco forme giuridiche (per filtro `legalFormCode`) |
| `GET /IT-check_id/{id}` | — | Stato di una richiesta async |

## Paginazione

Response sempre `{data: [...], success, message, error}` — **nessun
`totItems`/`totPage` in risposta**. Il conteggio si ottiene gratis con
`dryRun=1`, poi le pagine si calcolano lato nostro:

```
dryRun → count (gratis)
totPages = ceil(count / limit)
page i → skip = i * limit    // offset determinato, dataset stabile (registro)
```

`limit` max 1000 per call; dataset >1000 → più call con `skip`.

## Note sui dati

- `companyName` = **ragione sociale** ("PIZZERIA DA MARIO SNC DI MARIO
  ROSSI E C."), non l'insegna: cercare "pizzeria" matcha solo chi ce l'ha
  nella ragione sociale → la ricerca per categoria va su `atecoCode`.
- Indirizzi = **sede legale** (`address.registeredOffice`): per le
  micro-imprese coincide quasi sempre col punto vendita, ma
  catene/holding/studi possono averla altrove.
- `address.registeredOffice.gps.coordinates` = `[lng, lat]`.
- **Nessun telefono/sito/email nei dataset base**: il contatto economico è
  `pec` (0,03); telefono/sito/social solo via `IT-marketing` per-azienda.
- Freschezza: `lastUpdateTimestamp` per record = data ultima variazione.
- Sandbox: token e scope dedicati (`test.*`), le aziende presenti sono
  quelle di test della doc — non aspettarsi tutto il registro.

## Termini d'uso (art. 11 + note legali)

- **Uso interno OK**: salvare nel proprio DB/CRM i record acquistati e
  usarli operativamente è lo scenario normale dei clienti.
- **Vietata l'estrazione sistematica** per costituire una banca dati
  propria / rivendere i dati grezzi (art. 11.4: divieto di estrarre dati
  "in modalità [sistematica]" — verificare il testo integrale del PDF ToS
  se il modello di business include la rivendita).
- **Bulk occasionale consentito** (bonifica, verifiche massive, onboarding
  portafogli) se si resta nei rate limit; rate limit personalizzati su
  richiesta commerciale.
- Dati da fonti ufficiali trattati sotto codice ANCIC/GDPR per
  l'informazione commerciale.

## UX proposta (need: "aziende ristorazione Rivoli Collegno Grugliasco")

- **Input "dove"** → multiselect comuni su elenco ISTAT→Belfiore (file
  statico ~8k comuni); una call per comune. Zero risultati fuori zona,
  garantito dal filtro e non dal ranking.
- **Input "cosa"** → picker categorie mappato ad ATECO 2025
  (es. "ristorazione" → divisione 56); testo libero = filtro opzionale su
  ragione sociale.
- **Flow** → `dryRun` gratis: "N aziende · €X stimati" → conferma utente →
  fetch `dataEnrichment=address` (mappa) o `pec` (contattabilità).
- **Top customer** → bottone su scheda: `IT-marketing/{piva}` on demand
  per telefono/sito/fatturato. Si paga solo dove serve.
