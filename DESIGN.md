# DESIGN.md — Scout visual system

> Direction chosen via Impeccable decision (seed `3c1a088fde05b743`):
> **"Ordine di Servizio"** — assigned card #7 (griglia disciplinata).

## Thesis

The register of a working desk: every prospect is a numbered entry and
every drop of accent is an action.

## World

- **Ground**: warm paper (`oklch(0.963 0.007 95)`), dark-ink sidebar rail.
- **Rules**: hairline borders carry elevation — no decorative shadows.
- **One accent**: action blue (`--primary`, `oklch(0.45 0.185 264)`) spent
  ONLY where the user can act: buttons, links, selected row/pin state.
  Never decoration.
- **Type**: one grotesque (Geist Sans) + Geist Mono for protocol numbers,
  counts and tabular data (`font-mono` + `tabular-nums`).
- **Radius**: `0.375rem` (6px) — `rounded-md` default; the search band
  goes squarer (`rounded-sm`); no xl/2xl/3xl.
- **Density**: desk tool used for hours — compact rows, tight leading.

## Protocol-number idiom

Each search result is a numbered register entry (`01`, `02`, … in mono).
The SAME number links: list row ↔ map pin ↔ detail pane ↔ map popup
(`N° 03`).

- Rows: fixed height `h-[120px]`, 4 slots (title `leading-6` + 3 meta
  lines at `h-6`) — missing fields never collapse the row. The number
  lives in a full-height ledger column `w-10 border-r` (`bg-muted/40`),
  like a register margin.
- Companies rows expose real actions: phone → `tel:` link, website →
  external link (`relative z-10` above the row's stretched-button
  overlay).
- List panel header: `N° | <entità>` micro-label row on top, same
  ledger column.
- Selected/hovered row → `bg-accent/60`; ledger cell → `bg-primary/10`
  - `text-primary`.
- Map pin → SVG teardrop `.map-pin`: paper body (`.map-pin-shape` fill
  card + ink stroke), dark number inside the head; active → blue fill
  - light number. The map fits the result pins' bounds on each new search.
- Selecting a row opens the pin's popup as the eye's anchor; the map
  re-centers only when the pin is off-view or hugging the edge
  (`bounds.pad(-0.15)`).

## Two search directions

The product has two opposed search modes that must stay visually
distinct (see PRODUCT.md):

- **PROSPEZIONE** (outbound, the radar): `/companies`, `/job-offers`.
  Results are _register entries_ — numbered, transient, thrown away
  after evaluation.
- **ARCHIVIO** (inbound, the schedario): `/saved` → future qualified DB.
  Entries are _schede_ — cards in a grid (ragione sociale, P.IVA, fido,
  contatti), a different document type inside the same paper-office
  world. Cards ≠ register rows; that's the whole distinction. No second
  accent color — separation is carried by structure + labels.

Sidebar groups: `PROSPEZIONE` / `ARCHIVIO` micro-labels. Prospezione
entries carry the verb (`Cerca aziende`, `Cerca offerte`); archive
carries the object (`Liste salvate`). Dashboard is split into two
labeled zones matching them, side by side on desktop
(`lg:grid-cols-[1.1fr_1fr]`), stacked on smaller screens.

## Cycle idioms

- **Routing-slip strip** (dashboard top): 3 bordered panels —
  `CERCA → SALVA → DECIDI` — each a link with lucide icon + mono index;
  `ArrowRight` sits in the gap between panels (sm+). Teaches the
  workflow and navigates.
- **Register → scheda mini-scena** (`components/register-to-scheda.tsx`):
  educational diagram for archive empty states — a fictional register
  row (ledger `01` cell) arrowing into a scheda card (`SCHEDA` micro-label,
  `Check` + `P.IVA · fido · note`). `aria-hidden`, fictional data,
  stacks vertically on narrow screens.

## Surface idioms

- **Search band** (`SearchBar`): squared `rounded-sm` bordered band,
  cells with visible uppercase micro-labels (`10px`, `tracking-[0.08em]`)
  above each `h-8` value; focus highlights the whole cell
  (`focus-within:bg-accent/50`), never a ring on the bare input. Chrome
  autofill is re-skinned to card color in globals. The submit button is
  the last solid-blue cell.
- **Result lists**: bordered panel = header strip + `divide-y` rows;
  `scroll-list` scrolls, count line stays above.
- **Detail/map pane**: sticky `top-4 h-[70vh]` bordered panel; detail
  header starts with `N° nn` mono uppercase.
- **PageHeader**: hairline-bottom block, title + description only —
  no icon tiles, no domain accent colors.
- **Landing**: no eyebrow badge, no radial gradient; numbered steps use
  bordered mono counters; CTA band = flat `bg-foreground` slab.
- **No example chips**: search surfaces never pre-fill demo searches;
  placeholders are descriptive hints, not fake queries.

## Removed / forbidden

- Domain tone system (`--companies` blue, `--jobs` amber, `NavTone`,
  badge variants `companies`/`jobs`) — gone. Neutral icons everywhere.
- Icon-tile cards, `rounded-xl`+ cards with `shadow`, decorative
  gradients, `bg-primary` CTA washes, Plus Jakarta Sans.
- Do not reintroduce: gradient text, glassmorphism, blob decor,
  multi-hue domain coloring.

## States

- Loading → squared `Skeleton` rows in the same register shape.
- Idle → flat dashed placeholder rows / detail pane prompt.
- Pending (refetch) → `opacity-60` on list + small update chip.

## Files that own the system

- `app/globals.css` — tokens, `.map-pin`, `.scroll-list`, scrollbar,
  selection color.
- `components/search-bar.tsx` — the band idiom.
- `components/page-header.tsx` — register header.
- `app/(protected)/components/app-sidebar.tsx` + `brand-mark.tsx` — rail.
- `app/(protected)/{companies,job-offers}/components/search-section.tsx`
  — the register idiom in production.
- `app/(protected)/companies/components/companies-map.tsx` — numbered
  Leaflet pins, bounds-fitted to the active search.
