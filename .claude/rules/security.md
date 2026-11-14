# Security (the repo is public)

The repo is public and used in my CV. Everything in git is public forever, even after deletion.

- Secrets only in `.env` (listed in `.gitignore`). `.env.example` has names only, never values
- On the server: `.env` with `chmod 600`. In CI: GitHub Secrets
- Never read, show or write the value of a key, password or token, not in chat, logs, tests or comments either
- No server IP, personal emails, real user data or family names in the code. Use example data
- The project is private and has nothing to do with my job. No work email, work accounts or work repos
- Check `git diff --staged` for secrets before every commit
- If a secret gets into git by mistake: stop and ask me. No force-push or history rewriting on your own
- Tilbudsdata.dk's test key must not be used in the app

Set up in phase 0:

- GitHub: Secret scanning and Push protection enabled (Settings → Code security)
- `gitleaks` as a pre-commit hook and in CI, so commits with keys are stopped
- Dependabot for security updates
