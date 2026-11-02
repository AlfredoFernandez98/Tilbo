# CLAUDE.md

Kontekst til Claude Code. Læs den her og `docs/plan.md` før du gør noget.

## Projektet

Tilbo er en fælles købsliste og tilbudssøgning. Først til min familie, senere måske udgivet som app. Privat projekt, jeg bygger det selv.

Hele planen ligger i `docs/plan.md`. Den er sandheden. Hvis noget i koden og planen ikke passer sammen, så spørg mig.

## Sådan skal du hjælpe mig

- Guide mig step by step. Ét trin ad gangen, og vent på at jeg siger det virker, før vi går videre
- Forklar kort hvorfor, ikke kun hvad. Jeg lærer Node.js undervejs (jeg kender Java bedst)
- Skriv på dansk, kort og enkelt. Ingen lange forklaringer
- Brug bullets når der er flere ting
- Sig det, hvis noget jeg beder om går imod planen
- Når vi beslutter noget nyt, så opdater `docs/plan.md` og evt. en ADR i `docs/adr/`
- Når en fase er færdig, så skriv det i `docs/plan.md`
- Påstå aldrig at noget virker uden at vise output fra en kommando eller test

## Stack (besluttet)

- Backend: Node 22, TypeScript, Fastify, Drizzle, PostgreSQL 17
- Frontend: React, Vite, TanStack Query, TanStack Router, Tailwind, shadcn/ui, Zustand
- Monorepo: pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)
- Jobs: node-cron i API-processen
- Hosting: Docker Compose på DigitalOcean (Frankfurt, 1 GB RAM), Caddy, `tilbo.alfredofernandez.dk`
- Deploy: GitHub Actions bygger til GHCR og deployer via SSH

Brug ikke Java, Next.js, NestJS, Prisma, Redis eller Coolify/Dokploy uden at spørge først.

## Regler i resten af repoet

Ligger i `.claude/rules/`. Claude Code indlæser dem selv:

- `security.md` og `git.md`: altid
- `api.md`: når du arbejder i `apps/api/` eller `packages/shared/`
- `web.md`: når du arbejder i `apps/web/`

Personlige noter, der ikke skal i git, kan ligge i `CLAUDE.local.md` (står i `.gitignore`).

## Hvor er vi?

Se "Faser" i `docs/plan.md`. Nuværende fase: **0. Fundament** (ikke startet).
