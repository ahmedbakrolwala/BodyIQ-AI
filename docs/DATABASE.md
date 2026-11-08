# BodyIQ AI Phase 1 database foundation

## Connection and migration

The app uses the managed MySQL database configured by `DATABASE_URL` and Drizzle ORM. The schema is shared by development and production, so this phase is additive only: it does not rename, drop, or rewrite the starter `users` table.

Run the migration before allowing the first OAuth traffic to create or authenticate users:

```bash
pnpm db:push
```

`pnpm db:push` runs `drizzle-kit generate` and then `drizzle-kit migrate`. For this foundation, the generated migration evidence is `drizzle/0001_brave_glorian.sql` with snapshot `drizzle/meta/0001_snapshot.json`, in addition to the existing `drizzle/0000_elite_eternals.sql`. No seed users or production rows are created by tests.

## Phase 1 tables

- `users` remains the starter auth table.
- `userProfiles` stores one profile per user. `userId` is a unique foreign key to `users.id` with cascade delete. `displayName` is required and limited to 60 characters; `goal` is `get_fitter`, `build_strength`, or `improve_endurance`; `country` is a two-letter code defaulting to `IN`; and `units` is `metric` or `imperial` (default `metric`). `createdAt` and `updatedAt` are database timestamps.
- `nutritionEntries`, `workoutSessions`, `progressEntries`, and `coachConversations` are minimal future ownership boundaries. Each has an auto-incrementing ID, required `userId` foreign key with cascade delete, timestamps, and a user ownership index. No Phase 1 endpoints or AI behavior use these tables.

All table declarations and relations are in `drizzle/schema.ts` and `drizzle/relations.ts`.

## Backend API contract

The tRPC routes are exposed under `/api/trpc`:

- `profile.get` — protected query; accepts no client ownership identifier and returns the authenticated user's profile or `null`.
- `profile.save` — protected mutation; accepts `{ displayName, goal, country?, units? }`. Input is strict Zod validation, country is normalized to uppercase, and ownership is always derived from the authenticated `ctx.user.id`. Database errors are not swallowed.
- `foundation.status` — public query returning only `{ service, phase, databaseReachable }`. The reachability boolean is produced by `SELECT 1`; it never returns credentials, row counts, or other health metrics.

Existing `auth.*` and `system.*` routers remain registered.
