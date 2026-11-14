# Git

- `main` er altid deploybar. Feature-branches og PR
- Branch-navne på engelsk med type-præfiks, fx `docs/backlog`, `feat/shopping-list`
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Commits, PR-titler og PR-beskrivelser skrives på engelsk
- Ingen AI-signatur i commits eller PR'er
- Commit kun filer der skal bruges til at bygge, køre eller forstå appen. Mockups, eksporter og andet referencemateriale kommer ikke i git

## Pull requests

Alt i en PR skrives på engelsk. Skabelonen ligger i `.github/pull_request_template.md`.

- Titel: `type(scope): imperative summary`, 50-72 tegn, intet punktum. Typer: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`. Titlen bliver commit på `main` (squash-merge)
- Beskrivelse med tre afsnit: `## What and why`, `## How it was verified` (kommandoer og resultat, og hvad der ikke er testet), `## Notes` (valgfri: risici, opfølgning)
- Én PR gør én ting. Hellere for lille end for stor. Refactor i en separat PR
- Før merge skal hele tjeklisten i skabelonen være opfyldt: titel følger Conventional Commits, én ting, `check` og `gitleaks` grønne, ingen hemmeligheder eller persondata i diff, docs/plan/ADR opdateret hvis en beslutning er ændret, beskrivelsen passer stadig til den endelige diff
- Claude tjekker tjeklisten, før en PR åbnes, og retter beskrivelsen hvis diff'en ændrer sig
