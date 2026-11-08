# DESIGN.md — Scout visual system

> Direction: **Istituzionale** (preview `design/previews/a-istituzionale.html`).
> A quiet, reliable work tool: hairline structure, one institutional blue,
> nothing decorative. Chosen because the product must be obvious at first
> glance — few things, done plainly.

## Intent

Daily prospecting tool for recruiters at agenzie per il lavoro: they search,
evaluate, contact. Primary viewport desktop; mobile must never break.
Feel: affidabile, intuitivo, robusto — like a well-made banking back-office.

## Dials

- Density: compact-medium (rows 40–44px, card padding 16px, body 13.5–14px)
- Radius: `3px` base (`0.1875rem`) — squared professional, no pills
- Contrast: stark-leaning, cool greys
- Colour: monochrome + ONE institutional blue, semantic colours only for status
- Type: IBM Plex Sans + IBM Plex Mono (numbers, tabular data)
- Depth: hairline borders everywhere; shadows ONLY on overlays (menu, dialog, toast)
- Motion: minimal (120–160ms ease-out, colour/transform only)
- Theme: light-first, dark variant provided and intentional

## Tokens

```css
:root {
  --background: oklch(0.978 0.003 250);
  --foreground: oklch(0.23 0.02 255);
  --card: oklch(0.998 0.002 250);
  --card-foreground: oklch(0.23 0.02 255);
  --popover: oklch(0.998 0.002 250);
  --popover-foreground: oklch(0.23 0.02 255);
  --primary: oklch(0.42 0.12 255);
  --primary-foreground: oklch(0.98 0.005 250);
  --secondary: oklch(0.95 0.005 250);
  --secondary-foreground: oklch(0.3 0.02 255);
  --muted: oklch(0.95 0.005 250);
  --muted-foreground: oklch(0.47 0.015 250);
  --accent: oklch(0.92 0.02 255);
  --accent-foreground: oklch(0.36 0.1 255);
  --destructive: oklch(0.5 0.17 25);
  --destructive-foreground: oklch(0.98 0.005 250);
  --success: oklch(0.45 0.1 155);
  --warning: oklch(0.6 0.12 75);
  --info: oklch(0.45 0.1 235);
  --border: oklch(0.87 0.008 250);
  --input: oklch(0.8 0.01 250);
  --ring: var(--primary);
  --radius: 0.1875rem;
  --chart-1: oklch(0.42 0.12 255); --chart-2: oklch(0.55 0.1 200);
  --chart-3: oklch(0.5 0.1 155);   --chart-4: oklch(0.6 0.12 75);
  --chart-5: oklch(0.55 0.14 30);
  --sidebar: oklch(0.985 0.004 250);
  --sidebar-foreground: oklch(0.35 0.02 255);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--accent);
  --sidebar-accent-foreground: var(--accent-foreground);
  --sidebar-border: oklch(0.88 0.008 250);
  --sidebar-ring: var(--primary);
}

.dark {
  --background: oklch(0.185 0.012 255);
  --foreground: oklch(0.92 0.005 250);
  --card: oklch(0.215 0.012 255);
  --card-foreground: oklch(0.92 0.005 250);
  --popover: oklch(0.215 0.012 255);
  --popover-foreground: oklch(0.92 0.005 250);
  --primary: oklch(0.64 0.11 255);
  --primary-foreground: oklch(0.16 0.03 255);
  --secondary: oklch(0.26 0.012 255);
  --secondary-foreground: oklch(0.92 0.005 250);
  --muted: oklch(0.26 0.012 255);
  --muted-foreground: oklch(0.67 0.01 255);
  --accent: oklch(0.3 0.03 255);
  --accent-foreground: oklch(0.8 0.06 255);
  --destructive: oklch(0.65 0.16 25);
  --destructive-foreground: oklch(0.98 0.005 250);
  --success: oklch(0.68 0.1 155);
  --warning: oklch(0.72 0.12 75);
  --info: oklch(0.66 0.1 235);
  --border: oklch(0.3 0.012 255);
  --input: oklch(0.34 0.012 255);
  --ring: var(--primary);
  --sidebar: oklch(0.16 0.012 255);
  --sidebar-foreground: oklch(0.75 0.01 255);
  --sidebar-accent: oklch(0.3 0.03 255);
  --sidebar-accent-foreground: oklch(0.8 0.06 255);
  --sidebar-border: oklch(0.28 0.012 255);
  --sidebar-ring: var(--primary);
}
```

Fonts loaded via `next/font` → `--font-plex-sans`, `--font-plex-mono` vars.

## Typography

- **IBM Plex Sans** everywhere: body 400, emphasis 500, headings/UI 600–700.
- **IBM Plex Mono** for numbers only: KPI values, phone numbers, counts,
  dates in tables (`font-mono` + `tabular-nums`).
- Scale: h1 26–28 (hero up to 44), h2 19, h3 15, h4 13.5, body 13.5–14,
  small/caption 11–12.
- Headings `tracking-tight` (-0.015em); uppercase micro-labels
  `text-[11px] tracking-[0.07em] uppercase` — used sparingly (panel titles,
  table headers), never on every line.
- Line-height: body 1.5, headings 1.15–1.25.

## Layout

- App shell: **light** sidebar rail (`--sidebar`, ~224px) + main column
  (max ~1200px, padding 20–24). On mobile the rail collapses to a top bar.
- Density: table rows 40–44px, card padding 16px, sections spaced 16–24px.
- Group by spacing, not by extra boxes: avoid cards inside cards.
- Tables scroll horizontally inside their panel on small screens.

## Components

- **One primary action per view.** Everything else secondary/outline/ghost.
- **Panels**: `border` + `rounded` (3px), header strip + `divide-y` rows.
  No shadow on static surfaces.
- **Buttons**: solid primary; secondary = `bg-secondary` + border;
  outline = transparent + `--input` border; ghost; destructive; link.
  Heights sm 28 / md 34 / lg 42.
- **Badges**: 11px, tint bg + coloured text, `rounded` (3px) — statuses:
  Nuova = accent blue, Contattata = success, Da valutare = warning,
  Scartata = destructive, Archivio = neutral.
- **Inputs**: `--input` border, focus `ring-2 ring-ring` no offset.
- **Nav**: light rail; active item `bg-accent text-accent-foreground`.
- **KPI cards**: bordered card, mono value, muted label, delta in
  success/destructive.
- **Tables**: `th` uppercase 11px muted; hover `bg-muted`; selected row
  `bg-accent`; numbers in mono.
- **Map** (companies): keep the row↔pin counter link in mono, but plain —
  a number, not a "N° nn" protocol label. Pins stay teardrop: card body +
  ink stroke, active = primary fill.
- **Search band**: one bordered band with labelled cells is allowed ONLY on
  search pages; elsewhere plain inputs. Focus highlights the cell, never a
  ring on the bare input.
- **States**: skeleton rows in final shape; empty = icon + sentence +
  primary action; error = what happened + retry.

## Do / Don't

- DO spend the blue only on things the user can act on (buttons, links,
  active nav, focus ring, selected state, map pin active).
- DO keep surfaces flat: borders carry all structure.
- DO use real content and precise copy; buttons say what they do.
- DO keep the mobile fallback honest (sidebar→topbar, table→scroll).
- DON'T add gradients, glow, decorative shadows, icon tiles, large radii.
- DON'T multiply accents or coloured badges without meaning.
- DON'T repeat navigational idioms on every page (no routing strips,
  no recurring "how it works" diagrams, no protocol prefixes on every row).
- DON'T reintroduce: domain tone colors, protocol-number branding,
  register margins, `rounded-xl`+ cards, Geist fonts, dark sidebar rail.

## Files that own the system

- `app/globals.css` — tokens, `.map-pin`, `.scroll-list`, scrollbar,
  selection, autofill reskin.
- `app/layout.tsx` — font loading (IBM Plex Sans + IBM Plex Mono).
- `components/search-bar.tsx` — the search-band idiom.
- `components/page-header.tsx` — page header idiom.
- `app/(protected)/components/app-sidebar.tsx` + `components/brand-mark.tsx`
  — the light rail.
- `app/(protected)/companies/components/companies-map.tsx` — pins.
