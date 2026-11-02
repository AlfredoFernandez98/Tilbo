# Tilbo: plan

Sidst opdateret: 2. november 2026

Tilbo er en fælles købsliste og tilbudssøgning. Den starter som en app til familien, men er bygget så flere grupper kan komme til, og så den kan udgives som rigtig app senere.

## 1. Hvad appen skal kunne

### Brugere og grupper

- Hver bruger har sin egen profil: navn, e-mail, adgangskode, postnummer
- En gruppe har 1-10 medlemmer
- En bruger kan være med i maks 5 grupper
- Grupper er helt lukkede: er du i gruppe 1, kan du ikke se noget fra gruppe 2 (lister, noter, søgninger, medlemmer, feed)
- Man skifter mellem sine grupper i appen og ser kun den valgte gruppe
- Reglerne håndhæves i backend, ikke kun i frontend
- Roller i gruppen: administrator og medlem
- Man giver selv gruppen et navn, fx "Fernandez-familien"
- En bruger kan ikke være med i to grupper med samme navn. Andre brugere må gerne have en gruppe med samme navn, da grupperne ikke kan se hinanden
- Hver gruppe har teknisk et unikt id og en invitationskode
- Hver gruppe har ét postnummer, der bestemmer hvilke butikker og tilbud gruppen ser
- Invitation med kode eller e-mail, udløber efter 7 dage
- Ordet "Gruppe" bruges i UI'et indtil videre. Det ligger ét sted i koden, så det kan skiftes (fx til "Kurv")

### Fælles købsliste (hjertet i appen)

- Én fælles liste pr. gruppe, så alle kan se hvad der mangler
- Hver vare kan have en kort note, fx "den laktosefri" eller "2 stk"
- Hver vare viser hvem der tilføjede den, og hvornår (dato)
- Når en vare er købt, krydses den af. Det gemmes hvem der købte den og hvornår
- Afkrydsede varer forsvinder fra listen
- Er en vare på tilbud et sted, vises det ved siden af

### Tilbud og søgning

- Søg i ugens tilbud med fritekst
- Filtrer på butik og kategori
- Panel med detaljer om et tilbud: pris, normalpris, butik, gyldig til
- Tilbud vises ud fra gruppens postnummer

### Feed

- Viser hvad de andre i gruppen har tilføjet, købt og søgt på
- Kun inden for den valgte gruppe
- Man bestemmer selv om ens søgninger vises (delt/privat)

### Senere

- Notifikationer: vare på listen kommer på tilbud, nye varer på listen
- AI-panel og ugentlig plan med billigste butiksfordeling og besparelse

### Skærme

Seks skærme: Tilbud, Købsliste, Feed, Plan, Gruppe, Indstillinger. Plus login, AI-panel og tilbudsdetalje-panel. Sidebar på desktop, bundfaner på mobil.

### Rækkefølge

| Version | Indhold |
| --- | --- |
| 1 | Login, profil, grupper med invitation, fælles købsliste med noter, datoer og afkrydsning, tilbudssøgning |
| 2 | Feed, delingsregler, match mellem liste og tilbud, notifikationer |
| 3 | AI-panel og ugentlig plan |

## 2. Tekniske beslutninger

| Område | Valg | Hvorfor |
| --- | --- | --- |
| Backend | Node 24 LTS + TypeScript + Fastify | LTS til 2028. Lavt RAM-forbrug (1 GB droplet), ét sprog med frontend, gode AI-SDK'er |
| ORM | Drizzle | Tæt på SQL, migrations, nemt at bruge tsvector og pg_trgm |
| Database | PostgreSQL 17 i Docker | Gratis, alt ét sted, nemt at flytte til managed senere |
| Frontend | React + Vite + TanStack Query + TanStack Router + Tailwind + shadcn/ui | Kendt stack, typesikre routes, simpel state |
| Client-state | Zustand (kun til valgt gruppe, åbne paneler, filtre) | Lille og simpel |
| Repo | Ét monorepo med pnpm workspaces, uden Turborepo | Én udvikler, delte typer ét sted |
| Jobs | node-cron i API-processen | Ingen Redis eller worker nødvendig endnu |
| Hosting | Docker Compose på DigitalOcean droplet | Bruger den server der allerede findes |
| Proxy og HTTPS | Caddy | Automatisk Let's Encrypt |
| Deploy | GitHub Actions bygger images til GHCR og deployer via SSH | Ingen overhead på serveren (ikke Coolify/Dokploy) |
| Ikke valgt | Java/Spring Boot, Next.js, NestJS, Prisma | For tungt eller passer dårligt til nat-jobs og søgning |
| Licens | Ingen (alle rettigheder forbeholdt) | Koden kan læses i CV'et, men ikke kopieres, hvis appen udgives. MIT kan tilføjes senere |

## 3. Datakilder

| Kilde | Status | Brug |
| --- | --- | --- |
| Tjek / eTilbudsavis API (`squid-api.tjek.com/v2/offers/search`) | Gratis, ingen nøgle, ikke officielt dokumenteret | Første kilde. Hent én gang om dagen pr. område og cache |
| Salling Group API | Gratis nøgle, officielt | Kun madspild-tilbud. Evt. senere |
| Tilbudsdata.dk API | Betalt B2B, kræver aftale | Mail sendes senere med spørgsmål om hobbyadgang. Testnøglen bruges ikke i appen |
| Seed-data | Egne eksempeltilbud | Udvikling og tests |

Eksempel på kald til Tjek:

```
GET https://squid-api.tjek.com/v2/offers/search?query=skyr&r_lat=55.69&r_lng=12.55&r_radius=20000&r_locale=da_DK&limit=24&offset=0
```

Alle kilder bag samme interface, så de kan skiftes:

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

## 4. Repo-struktur

```
tilbo/
├── apps/
│   ├── api/                      # Fastify-backend
│   │   ├── src/
│   │   │   ├── modules/          # én mappe pr. feature
│   │   │   │   ├── auth/
│   │   │   │   ├── groups/
│   │   │   │   ├── offers/       # sources/tjek.ts, sources/seed.ts
│   │   │   │   ├── search/
│   │   │   │   ├── shopping-list/
│   │   │   │   ├── feed/
│   │   │   │   ├── sharing/
│   │   │   │   ├── notifications/
│   │   │   │   └── ai/
│   │   │   ├── jobs/             # import-offers.ts, match-list-items.ts
│   │   │   ├── db/               # schema.ts, migrations/
│   │   │   ├── plugins/          # jwt, cors, error-handler
│   │   │   ├── config.ts         # env-validering med zod
│   │   │   └── server.ts
│   │   └── Dockerfile
│   └── web/                      # React + Vite
│       ├── src/
│       │   ├── features/         # samme navne som api/modules
│       │   ├── components/ui/    # shadcn/ui
│       │   ├── layouts/          # AppShell: sidebar / bundfaner
│       │   ├── lib/              # api-klient, query-client
│       │   └── routes/           # TanStack Router
│       └── Dockerfile
├── packages/
│   └── shared/                   # typer og zod-skemaer delt af api og web
├── docs/
│   ├── plan.md
│   └── adr/                      # én kort fil pr. stor beslutning
├── .github/workflows/            # ci.yml, deploy.yml
├── docker-compose.yml            # lokal udvikling
├── docker-compose.prod.yml       # på serveren
├── Caddyfile
├── .env.example
├── CLAUDE.md
└── README.md
```

Princip: feature-mapper, ikke lag. Alt om grupper ligger i `modules/groups/`.

## 5. Datamodel

| Tabel | Vigtige kolonner | Bemærk |
| --- | --- | --- |
| `users` | id, name, email (unik), password_hash, postal_code, created_at | |
| `groups` | id, name, invite_code (unik), postal_code, created_by, created_at | Maks 10 medlemmer |
| `group_members` | group_id, user_id, role (`admin`/`member`), joined_at | PK (group_id, user_id). Maks 5 grupper pr. bruger. Ingen to grupper med samme navn for samme bruger |
| `invites` | id, group_id, email, token, expires_at, accepted_at | expires_at = nu + 7 dage |
| `stores` | id, name, chain, source_dealer_id | |
| `offers` | id, source, source_offer_id, name, name_normalized, price, normal_price, unit, quantity, store_id, valid_from, valid_to, image_url, category, search_vector, imported_at | Unik (source, source_offer_id). GIN på search_vector og name_normalized |
| `shopping_lists` | id, group_id, name | Én pr. gruppe |
| `list_items` | id, list_id, name, name_normalized, note, quantity, added_by, added_at, checked_by, checked_at, matched_offer_id, match_score | Afkrydsede vises ikke på listen |
| `searches` | id, user_id, group_id, query, store_filter, category_filter, is_shared, created_at | Bruges til feed |
| `sharing_settings` | user_id, group_id, share_searches, visible_in_feed | PK (user_id, group_id) |
| `notifications` | id, user_id, group_id, type, payload, read_at, sent_at, created_at | Version 2 |

Søgning i Postgres:

- `CREATE EXTENSION pg_trgm;`
- `search_vector` = `to_tsvector('danish', name)` som generated column
- Fritekst: `search_vector @@ plainto_tsquery('danish', $1)`
- Stavefejl: `name_normalized % $1 ORDER BY similarity(...) DESC`

Matching af købsliste til tilbud: normaliser navne (små bogstaver, fjern mængder), find aktive tilbud med `similarity > 0.35`, vælg det billigste med højest score.

## 6. Hosting

- Server: DigitalOcean droplet "web", Frankfurt, 1 GB RAM, 25 GB disk
- Domæne: alfredofernandez.dk (DNS hos DigitalOcean)
- App-adresse: `tilbo.alfredofernandez.dk` (A-record `tilbo` til droplet'ens IP)
- Byg images i GitHub Actions, ikke på serveren
- Swap-fil på 2 GB som sikkerhedsnet
- Resize kun CPU/RAM til 2 GB hvis det bliver for stramt (ikke disken)
- Backup: `pg_dump` hver nat via cron, gem 14 dage
- Sikkerhed: ufw (kun 22, 80, 443), SSH kun med nøgle, `.env` aldrig i git, fail2ban, unattended-upgrades
- Før opsætning: tjek hvad der allerede kører på droplet'en (port 80/443)

## 7. Faser

| Fase | Indhold | Færdig når |
| --- | --- | --- |
| 0. Fundament | Monorepo, CI, Docker, Caddy, deploy, hello world | `https://tilbo.alfredofernandez.dk/api/health` svarer 200 |
| 1. Auth og grupper | Signup, login, JWT, profil, opret gruppe, invitation | To brugere er i samme gruppe |
| 2. Købsliste | Fælles liste, noter, datoer, hvem tilføjede, afkryds | Familien kan bruge listen |
| 3. Tilbud og søgning | Seed, Tjek-adapter, nat-job, søg med filtre, detaljepanel | Man kan søge "skyr" og se rigtige tilbud |
| 4. Feed og match | Feed, delingsregler, match liste til tilbud | Listen viser hvor varen er billigst |
| 5. Notifikationer | In-app og e-mail | Mail når en vare kommer på tilbud |
| 6. AI | Butiksfordeling, besparelse, fritekst, ugentlig plan | AI-panelet svarer |

## 8. Åbne punkter

- Hvad hver skærm viser i detaljer
- Mail til Tilbudsdata om hobbyadgang
- Om "Gruppe" skal hedde noget andet i UI'et
- Tjek om `tilbo.dk`, app-navnet og varemærket er ledige
- Hullerne i afsnit 9

## 9. Huller og anbefalinger

Fundet 2. november 2026. Anbefalinger, ikke beslutninger endnu. Når et punkt er besluttet, flyttes det ind i det afsnit det hører til (og evt. en ADR).

| # | Hul | Anbefaling | Senest i fase |
| --- | --- | --- | --- |
| 1 | Tjek `/offers/search` kræver et søgeord, så natjobbet kan ikke hente alle tilbud for et område. API'et er ikke officielt | Find et endpoint der lister tilbud for et område. Læs deres vilkår | 3 |
| 2 | Tjek skal bruge lat/lng, gruppen har et postnummer | Statisk tabel med postnumre og deres midtpunkt i `packages/shared` | 3 |
| 3 | Både `users` og `groups` har postnummer | Fjern det fra `users`, eller brug det kun som forslag når man opretter en gruppe | 1 |
| 4 | `groups.invite_code` udløber aldrig, men invitationer skal udløbe efter 7 dage | Koden ligger i `invites` med `expires_at`, ikke på gruppen | 1 |
| 5 | Auth er ikke beskrevet | JWT i httpOnly-cookie (ikke localStorage), adgangskoder med argon2, nulstil adgangskode via e-mail | 1 |
| 6 | Ingen e-mail-udbyder valgt (invitation, nulstilling) | En med gratis niveau, fx Resend eller Brevo | 1 |
| 7 | Hvad sker der når admin eller sidste medlem forlader gruppen | Næste medlem bliver admin. Går det sidste medlem, slettes gruppen | 1 |
| 8 | Grænserne (10 medlemmer, 5 grupper, unikt navn) kan omgås af samtidige kald | Tjek i én transaktion med lås. Navne sammenlignes uden forskel på store og små bogstaver | 1 |
| 9 | Hvordan ser de andre ændringer på listen | TanStack Query med `refetchInterval` (ca. 10 sek). Ingen websockets i version 1 | 2 |
| 10 | Afkrydsning ved en fejl kan ikke fortrydes | "Fortryd" i et par sekunder efter afkrydsning | 2 |
| 11 | `pg_dump` på samme droplet er ikke en rigtig backup | Kopiér også dumpet væk fra serveren (DigitalOcean Spaces eller egen maskine) | 0 |
| 12 | Tidszone for cron-jobs | UTC eller `Europe/Copenhagen`. Dansk tid passer bedst til butikkernes uger. **Din beslutning** | 3 |
| 13 | Testopsætning ikke valgt | Vitest, og en rigtig Postgres i Docker til API- og databasetests | 0 |
| 14 | pg_trgm-indeks bliver ikke brugt til `%` uden den rigtige operatorklasse | `GIN (name_normalized gin_trgm_ops)` | 3 |
| 15 | 1 GB RAM til Postgres, API og Caddy ved siden af det der kører i dag | Mål forbruget efter fase 0 før vi bygger videre | 0 |
| 16 | Ingen licens i et offentligt repo betyder "alle rettigheder forbeholdt" | **Besluttet 2. november 2026:** ingen licens. Se afsnit 2 | 0 |
| 17 | Git-mailen i commits er offentlig | Brug GitHubs noreply-adresse i dette repo før første commit | 0 |
