# Tilbo: plan

Last updated: 15 November 2026

Tilbo is a shared shopping list and offer search. It starts as an app for my family, but is built so more groups can join, and so it can be published as a real app later.

## 1. What the app must do

### Users and groups

- Every user has their own profile: name, email, password
- A group has 1-10 members. Invitations stop when the group is full
- A user can be in at most 5 groups
- Groups are fully closed: if you are in group 1, you cannot see anything from group 2 (lists, notes, searches, members, feed)
- You switch between your groups in the app and only see the selected group
- The rules are enforced in the backend, not only in the frontend
- Roles in a group: admin and member
- You name the group yourself, e.g. "Home"
- A user cannot be in two groups with the same name. Other users may have a group with the same name, since groups cannot see each other
- Every group has a unique technical id
- Every group has one postal code, which decides which stores and offers the group sees
- Invitation via a shared link that several people can use, expires after 7 days. Email comes later (gap 6)
- An admin can remove other members. This revokes the group's invite links, so the removed member cannot rejoin with an old link. Decided 15 November 2026
- The word "Gruppe" is used in the UI for now. It lives in one place in the code, so it can be changed (e.g. to "Kurv")

### Shared shopping list (the heart of the app)

- One shared list per group, so everyone can see what is missing
- Each item can have a short note, e.g. "the lactose-free one" or "2 pcs"
- Each item shows who added it, and when (date)
- When an item is bought, it is checked off. Who bought it and when is stored
- Checked items disappear from the list
- If an item is on offer somewhere, it is shown next to it

### Offers and search

- Search this week's offers with free text
- Filter by store and category
- Panel with offer details: price, normal price, store, valid until
- Offers are shown based on the group's postal code

### Feed

- Shows what the others in the group have added, bought and searched for
- Only within the selected group
- You decide yourself whether your searches are shown (shared/private)

### Later

- Notifications: an item on the list goes on offer, new items on the list
- AI panel and weekly plan with the cheapest split across stores and savings

### Screens

Six screens: Offers, Shopping list, Feed, Plan, Group, Settings. Plus login, AI panel and offer detail panel. Sidebar on desktop, bottom tabs on mobile.

### Order

| Version | Content |
| --- | --- |
| 1 | Login, profile, groups with invitation, shared shopping list with notes, dates and check-off, offer search |
| 2 | Feed, sharing rules, match between list and offers, notifications |
| 3 | AI panel and weekly plan |

## 2. Technical decisions

| Area | Choice | Why |
| --- | --- | --- |
| Backend | Node 24 LTS + TypeScript + Fastify | LTS until 2028. Low RAM use (1 GB droplet), one language with the frontend, good AI SDKs |
| TypeScript in the API | Node runs `.ts` directly (type stripping), no build step | Fewer tools. Requires `.ts` in imports and no `enum` (`erasableSyntaxOnly`) |
| Auth | JWT in an httpOnly cookie, passwords with argon2 | See ADR 0001. Decided 14 November 2026 |
| Test database | PGlite (Postgres 18 in WebAssembly) in tests and locally, until Docker is set up | No Docker yet. Concurrent requests are not tested until we move to real Postgres. Open: Postgres 17 or 18 in production. Decided 14 November 2026 |
| Tests | Every change that adds or changes behaviour ships with unit tests in the same PR (Vitest). API tests call the routes against an in-memory database | Proves the code works and keeps `main` deployable. Decided 15 November 2026 |
| ORM | Drizzle | Close to SQL, migrations, easy to use tsvector and pg_trgm |
| Database | PostgreSQL 17 in Docker | Free, everything in one place, easy to move to managed later |
| Frontend | React + Vite + TanStack Query + TanStack Router + Tailwind + shadcn/ui | Known stack, type-safe routes, simple state |
| Client state | Zustand (only for selected group, open panels, filters) | Small and simple |
| Repo | One monorepo with pnpm workspaces, without Turborepo | One developer, shared types in one place |
| Jobs | node-cron in the API process | No Redis or worker needed yet |
| Hosting | Docker Compose on a DigitalOcean droplet | Uses the server that already exists |
| Proxy and HTTPS | Caddy | Automatic Let's Encrypt |
| Deploy | GitHub Actions builds images to GHCR and deploys via SSH | No overhead on the server (not Coolify/Dokploy) |
| Not chosen | Java/Spring Boot, Next.js, NestJS, Prisma | Too heavy or a poor fit for nightly jobs and search |
| License | None (all rights reserved) | The code can be read as part of my CV, but not copied, if the app is published. MIT can be added later |
| Git and PRs | Feature branches and PRs to `main`, squash-merge only, Conventional Commits, at most about 350 changed lines of code per PR. Template in `.github/pull_request_template.md` | `main` is always deployable, and the history is readable. Decided 14 November 2026 |
| Language | Everything in the repo and on GitHub is in English. UI text is Danish | The repo is public; the users are Danish. Decided 14 November 2026 |

## 3. Data sources

| Source | Status | Use |
| --- | --- | --- |
| Tjek / eTilbudsavis API (`squid-api.tjek.com/v2/offers/search`) | Free, no key, not officially documented | First source. Fetch once a day per area and cache |
| Salling Group API | Free key, official | Only food-waste offers. Maybe later |
| Tilbudsdata.dk API | Paid B2B, requires an agreement | An email asking about hobby access is sent later. The test key is not used in the app |
| Seed data | Own example offers | Development and tests |

Example call to Tjek:

```
GET https://squid-api.tjek.com/v2/offers/search?query=skyr&r_lat=55.69&r_lng=12.55&r_radius=20000&r_locale=da_DK&limit=24&offset=0
```

All sources behind the same interface, so they can be swapped:

```ts
interface OfferSource {
  name: string; // "tjek" | "salling" | "tilbudsdata" | "seed"
  fetchOffers(opts: { lat: number; lng: number; radiusM: number }): Promise<RawOffer[]>;
}

type NormalizedOffer = {
  sourceId: string; source: string; name: string;
  price: number; normalPrice: number | null; unit: string | null;
  storeName: string; validFrom: Date; validTo: Date; imageUrl: string | null;
};
```

## 4. Repo structure

```
tilbo/
├── apps/
│   ├── api/                      # Fastify backend
│   │   ├── drizzle/              # generated SQL migrations
│   │   ├── src/
│   │   │   ├── modules/          # one folder per feature
│   │   │   │   ├── auth/
│   │   │   │   ├── groups/
│   │   │   │   ├── health/
│   │   │   │   ├── invites/
│   │   │   │   ├── offers/       # sources/tjek.ts, sources/seed.ts
│   │   │   │   ├── search/
│   │   │   │   ├── shopping-list/
│   │   │   │   ├── feed/
│   │   │   │   ├── sharing/
│   │   │   │   ├── notifications/
│   │   │   │   └── ai/
│   │   │   ├── jobs/             # import-offers.ts, match-list-items.ts
│   │   │   ├── db/               # client.ts, schema.ts
│   │   │   ├── lib/              # small shared helpers
│   │   │   ├── app.ts            # builds the Fastify app
│   │   │   ├── config.ts         # env validation with zod
│   │   │   └── server.ts
│   │   └── Dockerfile
│   └── web/                      # React + Vite
│       ├── src/
│       │   ├── features/         # same names as api/modules
│       │   ├── components/ui/    # shadcn/ui
│       │   ├── layouts/          # AppShell: sidebar / bottom tabs
│       │   ├── lib/              # API client, query client
│       │   └── routes/           # TanStack Router
│       └── Dockerfile
├── packages/
│   └── shared/                   # types and zod schemas shared by api and web
├── docs/
│   ├── plan.md
│   └── adr/                      # one short file per major decision
├── .github/workflows/            # ci.yml, deploy.yml
├── docker-compose.yml            # local development
├── docker-compose.prod.yml       # on the server
├── Caddyfile
├── .env.example
└── README.md
```

The tree shows the target layout; some parts are not built yet.

Principle: feature folders, not layers. Everything about groups lives in `modules/groups/`. No CORS: web and API are served from the same domain.

## 5. Data model

| Table | Important columns | Note |
| --- | --- | --- |
| `users` | id, name, email (unique), password_hash, created_at | No postal code (gap 3) |
| `groups` | id, name, postal_code, created_by, created_at | At most 10 members. The invite code lives in `invites` (gap 4) |
| `group_members` | group_id, user_id, role (`admin`/`member`), joined_at | PK (group_id, user_id). At most 5 groups per user. No two groups with the same name for the same user |
| `invites` | id, group_id, token_hash, created_by, expires_at, created_at | Shared link: can be used by several people until it expires (7 days) or the group has 10 members. Only the sha256 hash of the token is stored. Decided 14 November 2026 |
| `stores` | id, name, chain, source_dealer_id | |
| `offers` | id, source, source_offer_id, name, name_normalized, price, normal_price, unit, quantity, store_id, valid_from, valid_to, image_url, category, search_vector, imported_at | Unique (source, source_offer_id). GIN on search_vector and name_normalized |
| `shopping_lists` | id, group_id, name | One per group |
| `list_items` | id, list_id, name, name_normalized, note, quantity, added_by, added_at, checked_by, checked_at, matched_offer_id, match_score | Checked items are not shown on the list. `name_normalized`, `quantity` and the match columns come in phase 4 |
| `searches` | id, user_id, group_id, query, store_filter, category_filter, is_shared, created_at | Used for the feed |
| `sharing_settings` | user_id, group_id, share_searches, visible_in_feed | PK (user_id, group_id) |
| `notifications` | id, user_id, group_id, type, payload, read_at, sent_at, created_at | Version 2 |

Search in Postgres:

- `CREATE EXTENSION pg_trgm;`
- `search_vector` = `to_tsvector('danish', name)` as a generated column
- Free text: `search_vector @@ plainto_tsquery('danish', $1)`
- Typos: `name_normalized % $1 ORDER BY similarity(...) DESC`

Matching the shopping list to offers: normalise names (lower case, remove quantities), find active offers with `similarity > 0.35`, pick the cheapest with the highest score.

## 6. Hosting

- Server: DigitalOcean droplet "web", Frankfurt, 1 GB RAM, 25 GB disk
- Domain: alfredofernandez.dk (DNS at DigitalOcean)
- App address: `tilbo.alfredofernandez.dk` (A record `tilbo` to the droplet's IP)
- Build images in GitHub Actions, not on the server
- 2 GB swap file as a safety net
- Only resize CPU/RAM to 2 GB if it gets too tight (not the disk)
- Backup: `pg_dump` every night via cron, keep 14 days
- Security: ufw (only 22, 80, 443), SSH with key only, `.env` never in git, fail2ban, unattended-upgrades
- Before setup: check what already runs on the droplet (ports 80/443)

## 7. Phases

| Phase | Content | Done when |
| --- | --- | --- |
| 0. Foundation (done) | Monorepo, CI, hello world, local database (PGlite) | The API can connect to the local database |
| 1. Auth and groups | Signup, login, JWT, profile, create group, invitation | Two users are in the same group |
| 2. Shopping list and deploy | Shared list, notes, dates, who added, check-off. Dockerfiles, Caddy, droplet, deploy workflow, backup and RAM measurement | The family can use the list at `https://tilbo.alfredofernandez.dk` |
| 3. Offers and search | Seed, Tjek adapter, nightly job, search with filters, detail panel | You can search "skyr" and see real offers |
| 4. Feed and match | Feed, sharing rules, match list to offers | The list shows where the item is cheapest |
| 5. Notifications | In-app and email | Email when an item goes on offer |
| 6. AI | Store split, savings, free text, weekly plan | The AI panel answers |

## 8. Open points

- What each screen shows in detail
- Email to Tilbudsdata about hobby access
- Whether "Gruppe" should be called something else in the UI
- Check whether `tilbo.dk`, the app name and the trademark are free
- Postgres 17 or 18 in production (PGlite runs 18)
- Whether an item's name and note can be edited after it is added. The API allows it; section 1 does not mention it
- The gaps in section 9

## 9. Gaps and recommendations

Found 2 November 2026. Recommendations, not decisions yet. When a point is decided, it moves into the section it belongs to (and maybe an ADR).

| # | Gap | Recommendation | At the latest in phase |
| --- | --- | --- | --- |
| 1 | Tjek `/offers/search` requires a search term, so the nightly job cannot fetch all offers for an area. The API is not official | Find an endpoint that lists offers for an area. Read their terms | 3 |
| 2 | Tjek needs lat/lng, the group has a postal code | Static table of postal codes and their centre in `packages/shared` | 3 |
| 3 | Both `users` and `groups` have a postal code | **Decided 14 November 2026:** only on the group | 1 |
| 4 | `groups.invite_code` never expires, but invitations must expire after 7 days | **Decided 14 November 2026:** the code lives in `invites` with `expires_at`, not on the group | 1 |
| 5 | Auth is not described | **Decided 14 November 2026:** JWT in an httpOnly cookie (not localStorage), passwords with argon2. Password reset by email waits for gap 6. See ADR 0001 | 1 |
| 6 | No email provider chosen (invitation, password reset) | One with a free tier, e.g. Resend or Brevo | 1 |
| 7 | What happens when the admin or the last member leaves the group | **Decided 14 November 2026:** the next member becomes admin. If the last member leaves, the group is deleted | 1 |
| 8 | The limits (10 members, 5 groups, unique name) can be bypassed by concurrent requests | **Decided 14 November 2026:** check in one transaction with a lock. Names are compared case-insensitively | 1 |
| 9 | How do others see changes to the list | TanStack Query with `refetchInterval` (about 10 s). No websockets in version 1 | 2 |
| 10 | Checking off by mistake cannot be undone | **Decided 14 November 2026:** unchecking undoes it (in the API). The UI shows "Undo" for a few seconds after checking off | 2 |
| 11 | `pg_dump` on the same droplet is not a real backup | Also copy the dump off the server (DigitalOcean Spaces or my own machine) | 2 |
| 12 | Time zone for cron jobs | UTC or `Europe/Copenhagen`. Danish time fits the stores' weeks best. **My decision** | 3 |
| 13 | Test setup not chosen | **Decided 14 November 2026:** Vitest. PGlite until Docker is set up, then real Postgres in Docker | 0 |
| 14 | A pg_trgm index is not used for `%` without the right operator class | `GIN (name_normalized gin_trgm_ops)` | 3 |
| 15 | 1 GB RAM for Postgres, API and Caddy next to what runs today | Measure usage at the first deploy in phase 2 | 2 |
| 16 | No license in a public repo means "all rights reserved" | **Decided 2 November 2026:** no license. See section 2 | 0 |
| 17 | The git email in commits is public | Use GitHub's noreply address in this repo before the first commit | 0 |

## 10. Notes for later

Created 3 November 2026. Things that must be included, but are not planned in a phase yet. When a point is decided, it moves into the section it belongs to.

### Stores with the most offers

- Filter and sort stores by how many items from the list are on offer
- E.g. "Netto: 7 of 12 items on offer", "Føtex: 4 of 12"
- The store with the most offers is shown at the top

### Total price per store

- Show the total if you buy the whole list in one store
- E.g. "All in Netto: 214 kr.", "All in Rema: 238 kr."
- Also show the cheapest mix of stores, and how much you save
- The code calculates the totals, not the AI

### Normal prices (not only offers)

- Also fetch regular prices, e.g. bananas, even when they are not on offer
- Then the total per store is correct, also for items without an offer
- Open: find a source. The Tjek API only has offers. To be investigated (web shops like Bilka ToGo, Nemlig, the Rema app, or Tilbudsdata)

### History

- Price history: what has the item cost before, and is the offer really cheap
- Purchase history: what has the group bought, when and where
- Open: which of them matters most, or both?

## 11. Status

Updated 15 November 2026. Current phase: **1. Auth and groups** (core backend done, frontend not started).

Phase 0 done 15 November 2026, except turning on Dependabot alerts and security updates in GitHub:

- Monorepo, API (Fastify, `/api/health`) and web (Vite, React, TanStack Query)
- CI with `check` and `gitleaks`, `concurrency` and timeouts. Does not run twice on PR branches
- Ruleset on `main`: requires a PR, squash-merge only, blocks force-push and deletion, requires `check` and `gitleaks`
- gitleaks as a pre-commit hook (`.githooks`). Secret scanning and push protection are on
- Dependabot every week for npm and Actions. Ignores major versions of `@types/node`. All open updates are merged
- PR template and PR rules (`.github/pull_request_template.md`)
- Drizzle and a local database (PGlite). `/api/health` checks the database

Done in the backend so far (phases 1 and 2):

- Signup, login, logout and "me" with an httpOnly cookie (ADR 0001)
- Create and list groups, invitation link and join, leave a group with admin hand-over
- Shopping list: list, add, edit, check off and undo
- 46 API tests, all green

Next:

1. Backend: list members, edit group name and postal code, remove a member (admin), edit profile
2. Frontend: signup and login, groups and invitation, shopping list
3. Offer search (phase 3), when gap 1 is solved

Moved to phase 2 (decided 14 November 2026: we build the app first and deploy before the family needs it):

- Dockerfiles, Caddy, droplet and deploy workflow (`deploy.yml`). An untested API Dockerfile is on the branch `feat/api-dockerfile`
- `docker-compose.yml` with Postgres and Vitest against real Postgres (gap 13)
- Backup off the server (gap 11) and RAM measurement (gap 15)
- Rate limiting on login and signup, node-postgres instead of PGlite, the Dockerfile must copy `apps/api/drizzle`
