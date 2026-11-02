# Sikkerhed (repoet er offentligt)

Repoet er offentligt og bruges i mit CV. Alt i git er offentligt for altid, også efter sletning.

- Hemmeligheder kun i `.env` (står i `.gitignore`). `.env.example` har kun navne, aldrig værdier
- På serveren: `.env` med `chmod 600`. I CI: GitHub Secrets
- Læs, vis eller skriv aldrig værdien af en nøgle, adgangskode eller token, heller ikke i chat, logs, tests eller kommentarer
- Ingen server-IP, personlige e-mails, rigtige brugerdata eller familiens navne i koden. Brug eksempeldata
- Projektet er privat og har intet med mit arbejde at gøre. Ingen arbejdsmail, arbejdskonti eller arbejdsrepoer
- Tjek `git diff --staged` for hemmeligheder før hver commit
- Kommer en hemmelighed i git ved en fejl: stop og spørg mig. Ingen force-push eller omskrivning af historik på egen hånd
- Tilbudsdata.dk's testnøgle må ikke bruges i appen

Sat op i fase 0:

- GitHub: Secret scanning og Push protection slået til (Settings → Code security)
- `gitleaks` som pre-commit hook og i CI, så commits med nøgler bliver stoppet
- Dependabot for sikkerhedsopdateringer
