---
paths:
  - "apps/api/**"
  - "packages/shared/**"
---

# Backend

## Regler i appen (skal håndhæves i backend)

- En gruppe har 1-10 medlemmer
- En bruger kan være med i maks 5 grupper
- Grupper er helt lukkede. Hver query skal filtrere på den gruppe brugeren er medlem af
- En bruger kan ikke være med i to grupper med samme navn
- Invitationer udløber efter 7 dage

## Kode

- Feature-mapper: `apps/api/src/modules/<feature>/`
- Delte typer og zod-skemaer i `packages/shared`
- Tilbudskilder bag `OfferSource`-interfacet (`modules/offers/sources/`)
- Tests i samme ændring som ny adfærd
- Små, fokuserede ændringer. Ingen oprydning i kode vi ikke arbejder på
- Tider gemmes i UTC i databasen
