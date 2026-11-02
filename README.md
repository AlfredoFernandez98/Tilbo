# Tilbo

Fælles købsliste og tilbudssøgning for familien.

- Én fælles liste pr. gruppe, med noter, hvem der tilføjede og hvornår
- Søg i ugens tilbud fra danske butikker
- Se hvor varerne på listen er billigst

Status: fase 0 (fundament) i gang. Se [docs/plan.md](docs/plan.md).

## Stack

Node 24, TypeScript, Fastify, Drizzle, PostgreSQL, React, Vite, Tailwind, shadcn/ui. pnpm monorepo. Docker Compose og Caddy på DigitalOcean.

## Kør lokalt

Kræver Node 24 (se `.nvmrc`, fx via `fnm`) og pnpm via `corepack enable pnpm`.

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/api/health

Tjek alt: `pnpm typecheck && pnpm test && pnpm build`.

Database (`docker compose up -d db`) kommer senere i fase 0.

## Mapper

```
apps/api        backend
apps/web        frontend
packages/shared delte typer
docs/           plan og beslutninger
```
