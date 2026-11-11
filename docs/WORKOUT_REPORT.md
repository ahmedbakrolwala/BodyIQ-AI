# BodyIQ AI Workout Generator Report

## Delivered

The authenticated Workouts experience now generates owner-scoped plans from the saved fitness profile and explicit choices. Users can select muscle gain, fat loss, strength or general fitness; gym or home; full body, upper/lower, push/pull/legs or an individual muscle group. Equipment and location filters are applied against a server-owned exercise catalog.

Each generated exercise carries its name, target muscles, instructions, default sets, repetition guidance, rest time, equipment and optional demonstration metadata. The mobile review screen shows these details before a user starts. The existing clearly labeled guest Design Preview remains available and does not create or persist workouts.

Starting a workout creates an idempotent owner-scoped session. The active session writes each set with repetitions, weight in kilograms, exercise and set number through protected tRPC procedures. Users can skip an exercise, replace it with another exercise in the generated plan, and explicitly complete the session. The UI keeps retry and failure states honest; it never silently marks a set or workout as complete.

Completed session history is available at `/workout-history`. Personal records are available at `/workout-records` and are derived only from completed sessions. They use a transparent Epley estimated one-repetition-max calculation and are labeled `estimated`; planned, skipped and incomplete work is excluded.

## Backend and data ownership

The implementation adds `shared/workouts.ts`, the server-owned catalog in `server/services/workout-catalog.ts`, the owner-scoped repository in `server/repositories/workouts.ts`, protected routes in `server/routers/workouts.ts`, and additive schema migration `drizzle/0006_workout_backend.sql`. The migration adds workout plan snapshots, plan exercises, session exercise state, and set logs while retaining the prior legacy tracking tables for compatibility. All reads and mutations derive the user ID from the authenticated session; no client-supplied user ID is accepted.

The managed database already contained the workout tables from the applied 0006 schema. The missing Drizzle snapshot was restored so `pnpm db:push` is now a no-op and does not attempt to recreate existing tables. No test workout, set, weight or health record was seeded.

## Verification

The focused workout suite passes 3 tests covering catalog filtering, strict ownership/input contracts and estimated-record math. The complete regression suite passes 102 tests across 20 files. `pnpm check`, `pnpm lint`, `pnpm exec drizzle-kit check`, `pnpm build`, and Expo web/Android/iOS JavaScript exports all pass. Metro and API listeners returned HTTP 200 for the workout route and API health check, and the route manifest contains `/workout-session`, `/workout-history` and `/workout-records`. The public browser verified that the guest Workouts screen still presents Design Preview/sample labels and does not start or record a session.

A signed native release, physical-device camera/sensor checks and production store submission remain outside this implementation. Demonstration URLs are optional catalog metadata; when absent, text instructions remain the source of guidance. Users remain responsible for appropriate form, load selection and medical clearance.
