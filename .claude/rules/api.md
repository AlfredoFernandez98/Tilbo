---
paths:
  - "apps/api/**"
  - "packages/shared/**"
---

# Backend

## App rules (enforced in the backend)

- A group has 1-10 members
- A user can be in at most 5 groups
- Groups are fully closed. Every query must filter on the group the user is a member of
- A user cannot be in two groups with the same name
- Invitations expire after 7 days

## Code

- Feature folders: `apps/api/src/modules/<feature>/`
- Shared types and zod schemas in `packages/shared`
- Offer sources behind the `OfferSource` interface (`modules/offers/sources/`)
- Tests in the same change as new behaviour
- Small, focused changes. No clean-up in code we are not working on
- Times are stored in UTC in the database
