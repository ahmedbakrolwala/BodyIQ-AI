# Tracking backend

The tracking API is protected and always scopes database access to `ctx.user.id`. The client may provide a UUID idempotency key, but never an owner ID or timestamp.

## Routes

- `tracking.get({ timeZone })` requires a valid IANA time-zone identifier and returns the exact `TrackingSummary` shape from `shared/tracking.ts`.
- `tracking.logMeal({ clientId, name, mealType, calories, proteinG, carbsG, fatG, timeZone })` stores a server-timestamped meal and returns `MealRecord`.
- `tracking.startWorkout({ clientId, timeZone })` snapshots the saved fitness workout plan. It never fabricates a plan. If an active workout exists for the user, including one started on an earlier local day, that record is returned. If no fitness profile exists, the route returns `BAD_REQUEST`.
- `tracking.completeWorkout({ id })` can only complete an owned positive integer ID. Its update is guarded by `completedAt IS NULL`; repeated calls return the already completed record and do not create a second session.
- `tracking.logWeight({ clientId, weightKg, timeZone })` stores a server-timestamped weight and returns `{ weightKg, recordedAt }`. When a fitness profile exists, the operation runs in a transaction, locks the profile row, and changes only `profile.weightKg` through `JSON_SET`, preserving units, goals, diet, and all other fields.

All input objects are strict. Reusing a client UUID with a different payload returns a conflict; retrying with the same payload returns the original record without adding another aggregate. Meal and weight timestamps are generated on the server, so client values cannot be future-dated.

## Summary semantics

The supplied IANA zone controls all local-day and Monday-week boundaries. Database timestamps remain UTC. A day and week are represented as half-open `[start, end)` intervals calculated from local wall-clock midnights, so spring-forward and fall-back days are 23 or 25 hours as appropriate.

`todayWorkout` is the active owned workout first, regardless of start date; otherwise it is the most recently completed workout whose completion is in the current local day. `weekly.completedDays` counts distinct local completion dates, while `targetDays` comes only from the saved fitness plan. Macro totals include only real current-day meal rows. Remaining and over-target calories are `null` when targets are unavailable and otherwise clamp at zero. No calories-burned estimate is included.

`recentProgress` contains the last five actual weight events and completed workout events combined, newest first, with generic `Weight`/`Workout` labels and no fabricated placeholders. The current weight comes from the saved fitness profile when present (every successful weight log synchronizes it); without a profile it falls back to the latest retained weight log.

## Storage

`foodLogs`, `trainingLogs`, and `weightLogs` are user-owned and cascade on user deletion. Each has a composite `(userId, clientId)` unique index and a `(userId, time)` index. Training rows additionally have `(userId, startedAt)`, `(userId, completedAt)`, and a nullable unique `activeUserId`; only the active row carries the owner ID in that column.

This backend change intentionally does not add or run a migration. The parent integration should generate/review the Drizzle migration and apply it through the normal deployment process; no live database writes are performed here.

## Synchronization and concurrency hardening

Full fitness saves and weight writes serialize on the stable owner row. An explicitly confirmed new/changed profile weight appends a real weight event. The last confirmed measurement save is authoritative; unrelated unit changes retain weight using JSON_SET. Duplicate-key races are recovered outside failed transactions, active workout races resolve to the owned active record, and completion locks the owned row. The active/today workout query is bounded; recent progress uses SQL limits.
