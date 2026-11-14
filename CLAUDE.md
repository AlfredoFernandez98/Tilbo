# CLAUDE.md

Context for Claude Code. Read this and `docs/plan.md` before doing anything.

## The project

Tilbo is a shared shopping list and offer search. First for my family, maybe published as an app later. A private project I build myself.

The whole plan is in `docs/plan.md`. It is the source of truth. If the code and the plan disagree, ask me.

## How to help me

- Guide me step by step. One step at a time, and wait until I say it works before moving on
- Briefly explain why, not only what. I am learning Node.js as I go (I know Java best)
- Reply to me in Danish, short and simple. No long explanations
- Use bullets when there are several things
- Tell me if something I ask for goes against the plan
- When we decide something new, update `docs/plan.md` and, if relevant, add an ADR in `docs/adr/`
- When a phase is done, write it in `docs/plan.md`
- Never claim something works without showing output from a command or test

## Language

- Everything in git and on GitHub is English: code, comments, test names, README, docs, rules, ADRs, commits and PRs
- Text that users see in the app (UI) is Danish
- Chat with me is Danish

## Stack (decided)

- Backend: Node 24, TypeScript, Fastify, Drizzle, PostgreSQL 17
- Frontend: React, Vite, TanStack Query, TanStack Router, Tailwind, shadcn/ui, Zustand
- Monorepo: pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)
- Jobs: node-cron in the API process
- Hosting: Docker Compose on DigitalOcean (Frankfurt, 1 GB RAM), Caddy, `tilbo.alfredofernandez.dk`
- Deploy: GitHub Actions builds to GHCR and deploys over SSH

Do not use Java, Next.js, NestJS, Prisma, Redis or Coolify/Dokploy without asking first.

## Rules for the rest of the repo

In `.claude/rules/`. Claude Code loads them by itself:

- `security.md` and `git.md`: always
- `api.md`: when working in `apps/api/` or `packages/shared/`
- `web.md`: when working in `apps/web/`

Personal notes that must not be in git can go in `CLAUDE.local.md` (listed in `.gitignore`).

## Where are we?

See "Faser" (phases) in `docs/plan.md`. Current phase: **0. Foundation** (in progress).
