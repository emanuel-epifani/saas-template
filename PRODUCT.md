# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: teams at agenzie per il lavoro (staffing/labor agencies) in Italy who prospect for client companies and place candidates. Freelance recruiters are a secondary audience on the same flows — no distinct UX is required for them.

## Product Purpose

Scout is a prospecting radar for recruiters: it finds companies to contact for new partnerships and open job offers where candidates can be proposed — from a single screen, organized by territory. Success means a recruiter identifies and contacts a promising prospect in minutes.

The real workflow is a two-direction loop, and the product must make the direction unmistakable:

1. PROSPEZIONE (outbound, the radar): search NEW companies and open job offers in the wild — the current /companies and /job-offers surfaces.
2. QUALIFICA (per-company analysis): each prospect is vetted one by one — creditworthiness check ("fido", e.g. Cerved/Creditsafe), partita IVA, ragione sociale, contacts.
3. ARCHIVIO (the shared curated DB): only qualified companies enter the internal database — "deve essere oro", the single source of truth the whole agency searches.
4. PROPOSIZIONE (candidate placement): when candidates arrive, recruiters search the ARCHIVE, not the wild — e.g. Monday ritual: take the 20 best candidates → find fitting known companies → propose them.

The end goal is new partnerships; prospecting is the intake, the archive is the asset. The two search directions (new in the wild vs. known in the archive) must be visually and structurally distinct throughout the product.

## Positioning

Sell-side orientation, not job-seeking: the user is the recruiter hunting for clients, not the candidate hunting for work. Two concrete mechanisms are confirmed: ready-to-use contacts (phone, site, map position immediately available) and companies + job offers as two prospecting sources in one place. A sharper unique claim versus adjacent tools is an open decision — the UX currently carries the differentiation.

## Operating Context

Daily prospecting sessions at a desk: set sector or role plus a zone, scan results with contacts and map at a glance, then call, write, or propose a candidate. Italian market first; UI copy is Italian today and must not assume Italian-only tomorrow (i18n planned — copy stays centralized in texts.ts).

## Capabilities and Constraints

- Companies search by sector/activity + city: name, address, phone, website, position on map (SerpApi data).
- Job offers search by role + zone: details, salary when available, source, direct link to the original posting.
- Saved items: announced "presto" — surface exists, feature pending.
- Auth and account via Better Auth (daveyplate better-auth-ui views).
- Stack: Next.js 16 + React 19, Tailwind 4 + shadcn/ui, Drizzle/Postgres, server actions.
- Core interaction shape to preserve: segmented search bar + scrollable result list + live map.

## Brand Commitments

Name "Scout" and the radar metaphor (tagline "Il radar dei recruiter") are binding. Italian voice: direct, plain, no hype. Current mark (Lucide Radar glyph on a primary tile) is the incumbent asset, not a confirmed final logo.

## Evidence on Hand

No testimonials, customer logos, metrics, or pricing exist — future surfaces must not fabricate them. The landing's product preview uses fictional company data by design.

## Product Principles

1. Speed to contact: every screen shortens the path from search to call/write.
2. Evaluate at a glance: contacts, map position, and open offers visible without drill-down.
3. Workday instrument: sober professional tool a recruiter lives in for hours — clarity and density outrank decoration.
4. Italian first, i18n ready: all copy centralized, no language assumptions baked into layout.
