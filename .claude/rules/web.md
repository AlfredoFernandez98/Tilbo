---
paths:
  - "apps/web/**"
---

# Frontend

- Feature folders: `apps/web/src/features/<feature>/`, same names as `apps/api/src/modules/`
- Shared types and zod schemas come from `packages/shared`
- The UI word "Gruppe" lives in one place (e.g. `packages/shared/src/labels.ts`), so it can be renamed
- Times are shown in Danish time
- Tests in the same change as new behaviour
- Small, focused changes. No clean-up in code we are not working on
