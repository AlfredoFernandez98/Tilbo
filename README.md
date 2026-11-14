# Tilbo

A shared shopping list and offer search for the family.

- One shared list per group, with notes, who added an item and when
- Search this week's offers from Danish shops
- See where the items on the list are cheapest

Status: phase 0 (foundation) in progress. See [docs/plan.md](docs/plan.md) (in Danish for now).

## Stack

Node 24, TypeScript, Fastify, Drizzle, PostgreSQL, React, Vite, Tailwind, shadcn/ui. pnpm monorepo. Docker Compose and Caddy on DigitalOcean.

## Run locally

Needs Node 24 (see `.nvmrc`, e.g. via `fnm`) and pnpm via `corepack enable pnpm`.

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/api/health

Check everything: `pnpm typecheck && pnpm test && pnpm build`.

Database (`docker compose up -d db`) comes later in phase 0.

## Folders

```
apps/api        backend
apps/web        frontend
packages/shared shared types
docs/           plan and decisions
```
