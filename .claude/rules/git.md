# Git

- `main` er altid deploybar. Feature-branches og PR
- Branch-navne på engelsk med type-præfiks, fx `docs/backlog`, `feat/shopping-list`
- Conventional Commits. Typer: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`. Scope er valgfri, fx `feat(web):`
- Commits, PR-titler og PR-beskrivelser skrives på engelsk
- Ingen AI-signatur i commits eller PR'er
- Commit kun filer der skal bruges til at bygge, køre eller forstå appen. Mockups, eksporter og andet referencemateriale kommer ikke i git

## Pull requests

Skabelonen ligger i `.github/pull_request_template.md`. Kun squash-merge er tilladt (håndhæves af ruleset på `main`).

- Titel: `type(scope): imperative summary`, højst 72 tegn, intet punktum. Titlen bliver commit på `main`. Dependabots egne titler er undtaget
- Beskrivelse med tre afsnit: `## What and why`, `## How it was verified` (kommandoer og resultat, og hvad der ikke er testet), `## Notes` (valgfri: risici, opfølgning). Derefter tjeklisten `## Before merge`
- Én PR gør én ting. Hellere for lille end for stor. Refactor i en separat PR
- Højst ca. 350 ændrede linjer kode pr. PR, medmindre jeg siger andet. `pnpm-lock.yaml` og genererede filer (fx migrations) tæller ikke med. Bliver det større, så del op i flere PR'er
- Før merge skal hele tjeklisten i skabelonen være opfyldt: titel følger Conventional Commits, én ting og højst ca. 350 linjer, `check` og `gitleaks` grønne, ingen hemmeligheder eller persondata i diff, docs/plan/ADR opdateret hvis en beslutning er ændret, beskrivelsen passer stadig til den endelige diff
- Claude tjekker tjeklisten, før en PR åbnes, og retter beskrivelsen hvis diff'en ændrer sig
