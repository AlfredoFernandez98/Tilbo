---
paths:
  - "apps/web/**"
---

# Frontend

- Feature-mapper: `apps/web/src/features/<feature>/`, samme navne som `apps/api/src/modules/`
- Delte typer og zod-skemaer hentes fra `packages/shared`
- Ordet "Gruppe" i UI'et ligger ét sted (fx `packages/shared/src/labels.ts`), så det kan skiftes
- Tider vises i dansk tid
- Tests i samme ændring som ny adfærd
- Små, fokuserede ændringer. Ingen oprydning i kode vi ikke arbejder på
