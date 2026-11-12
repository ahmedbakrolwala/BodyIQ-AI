## Progress tracking implementation

The authenticated Progress route will preserve the existing local Design Preview for guests and use a real owner-scoped progress repository for signed-in users. A progress record stores canonical metric values in kilograms/centimeters, recorded time, optional note and an optional private managed-storage photo key. The client can create, edit and delete records but never supplies a user ID; protected procedures derive ownership from the authenticated session.

The progress summary will return recent records, weekly/monthly chart points, workout consistency from completed sessions, strength improvement from completed logged sets, goal completion based only on saved profile targets and recorded values, and deterministic milestones such as first record, streaks and personal bests. Empty data remains empty. No future body transformation or health outcome is predicted.

Optional photos are uploaded server-side to `users/{userId}/progress/{uuid}` after MIME/size validation. The database stores only the private storage key; reads return short-lived signed URLs only after an owner-scoped query. Deletion removes the database reference and attempts storage cleanup through the managed storage contract when available.

Project structure additions: `shared/progress.ts` for strict contracts; `server/repositories/progress.ts` for owner-scoped CRUD and aggregation; `server/routers/progress.ts` for protected procedures; `app/log-progress.tsx` for the mobile create/edit form; and the existing `app/(tabs)/progress.tsx` for the charts and summaries.
