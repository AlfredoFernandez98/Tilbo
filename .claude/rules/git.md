# Git

- `main` is always deployable. Feature branches and PRs
- Branch names in English with a type prefix, e.g. `docs/backlog`, `feat/shopping-list`
- Conventional Commits. Types: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`. Scope is optional, e.g. `feat(web):`
- Commits, PR titles and PR descriptions are written in English
- No AI signature in commits or PRs
- Only commit files needed to build, run or understand the app. Mockups, exports and other reference material stay out of git

## Pull requests

The template is in `.github/pull_request_template.md`. Only squash merge is allowed (enforced by the ruleset on `main`).

- Title: `type(scope): imperative summary`, at most 72 characters, no full stop. The title becomes the commit on `main`. Dependabot's own titles are exempt
- Description with three sections: `## What and why`, `## How it was verified` (commands and result, and what was not tested), `## Notes` (optional: risks, follow-up). Then the `## Before merge` checklist
- One PR does one thing. Better too small than too big. Refactoring in a separate PR
- At most about 350 changed lines of code per PR, unless I say otherwise. `pnpm-lock.yaml` and generated files (e.g. migrations) do not count. If it grows bigger, split it into several PRs
- Before merge the whole template checklist must hold: title follows Conventional Commits, one thing and at most about 350 lines, `check` and `gitleaks` green, no secrets or personal data in the diff, docs/plan/ADR updated if a decision changed, the description still matches the final diff
- Claude checks the checklist before opening a PR, and fixes the description if the diff changes
