# Tilbo

Fælles købsliste og tilbudssøgning for familien.

- Én fælles liste pr. gruppe, med noter, hvem der tilføjede og hvornår
- Søg i ugens tilbud fra danske butikker
- Se hvor varerne på listen er billigst

Status: planlægning. Se [docs/plan.md](docs/plan.md).

## Stack

Node 24, TypeScript, Fastify, Drizzle, PostgreSQL, React, Vite, Tailwind, shadcn/ui. pnpm monorepo. Docker Compose og Caddy på DigitalOcean.

## Kør lokalt

Kommer i fase 0. Planen er:

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm dev
```

## Mapper

```
apps/api        backend
apps/web        frontend
packages/shared delte typer
docs/           plan og beslutninger
```
