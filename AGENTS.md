<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Tech Stack:
- Framework: Next.js ^16 + React ^19
- ORM: Drizzle
- Auth library: Better Auth
- Db: postgres
- Styling: Tailwind 4 + shadcn/ui
- Server state: TanStack Query
- Client state: Zustand
- Validation:
  - Env vars → `env.ts` via @t3-oss/env-nextjs. In app code always `env.X` from `@/env`, never `process.env`
  - Input (forms, server actions, API payloads) → zod schemas
- Forms: React Hook Form + zodResolver — client validation reuses the same zod schemas
- Lint & format: Biome (`biome.json`) — one tool replaces eslint+prettier; `npm run check` runs both

## Architecture
- Feature-centric: each feature owns `app/{feature}/` (page, components/, hooks/, lib/)
- Big features split 3 ways: `lib/{feature}-logic.ts` (pure, no React) · `lib/{feature}-store.ts` + hooks (Zustand + React glue) · `components/*.tsx` (dumb presentation)
- Global, NOT feature-scoped: `app/models.ts` (ALL types, no per-feature `types/`), `app/globals.css` (only stylesheet), `lib/texts.ts` (all copy, flat `as const`)

## Styling
- Tailwind classes in `className` only — no `.css`/`.scss` files for components
- UI primitives come from shadcn/ui (`components/ui/`), never hand-rolled
- Semantic tokens only (`bg-card`, `text-muted-foreground`) — never literal colors (`bg-blue-500`, `text-[#fff]`); no `dark:` variants, the theme handles it
- `style={{}}` only for runtime-computed values (e.g. `width: ${pct}%`)

## Project structure
- `app/` — App Router: routes, layouts, globals.css only
- `lib/` — shared non-UI logic; `lib/db/` holds the DB layer (`schema.ts` = tables, `index.ts` = drizzle client, `migrations/` = generated SQL, never edit by hand)
- `components/` — shared UI components (shadcn/ui lives in `components/ui/`)
- `env.ts` (root) — env validation; app code imports `env` from `@/env`

## TypeScript
- Enforced in tsconfig: `strict` + `noUncheckedIndexedAccess` + `noImplicitReturns` + `noFallthroughCasesInSwitch`
- No `any` (use `unknown`), no `@ts-ignore` — fix the real type error
- `interface` for object shapes, `type` for unions/aliases
- Variant data → discriminated unions (`{ kind: ... }`), never bags of optional fields
- Finite constants → plain `enum` (never `const enum`, breaks under isolatedModules)
- `satisfies` over `as`; `as` only when you know more than the compiler
- Boundary types come from schemas: `z.infer<typeof Schema>` is the single source
