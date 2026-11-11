# BodyIQ AI Nutrition and Workout System Plan

## Existing nutrition architecture

The existing TypeScript/React Native/Expo Router mobile app and Express/tRPC backend use owner-scoped Drizzle persistence on Manus-managed MySQL-compatible cloud data. Nutrition uses server-owned catalogs, strict shared contracts, protected tRPC procedures and additive migrations. The workout system follows the same architecture and keeps all prior nutrition, scanner, onboarding, authentication and dashboard behavior intact.

## Workout implementation approach

Add a server-owned exercise catalog and a deterministic workout generator driven by the saved fitness profile plus explicit user selections. Supported goals are muscle gain, fat loss, strength and general fitness. Supported locations are gym and home. Supported structures are full body, upper/lower, push/pull/legs and individual muscle group focus. The generator filters exercises by location/equipment, selects an appropriate routine, and returns exercise instructions, target muscles, sets, repetitions, rest and optional demonstration metadata. It provides general fitness education, not medical treatment or a promise of results.

Persist generated plans and completed sessions with owner-scoped records. A workout session stores its exercise snapshot so a later catalog change does not rewrite history. Set logs store exercise index, set number, repetitions, weight, completion state and timestamps. Replace and skip actions update only the active owner’s session. Completion is explicit and idempotent. Personal records are derived from completed logged sets using a transparent estimated one-repetition-max calculation and are never inferred from skipped or incomplete sets. Workout history and records are queried only for the signed-in user.

## Project structure

- `shared/workouts.ts`: strict goal/location/split schemas, exercise and plan contracts, set logging and replacement inputs.
- `server/services/workout-catalog.ts`: curated exercise catalog, equipment/location filtering and plan-generation rules.
- `server/repositories/workouts.ts`: owner-scoped plan/session/set/history/PR persistence and aggregation.
- `server/routers/workouts.ts`: protected tRPC procedures for generate, start, log set, replace, skip, complete, history and records.
- `drizzle/schema.ts` plus additive migration: workout plans, plan exercises, sessions, set logs and indexes.
- `components/bodyiq/workout-generator.tsx`: authenticated selection controls and generated-plan review.
- `app/workout-session.tsx`: active exercise card, set logger, replace/skip controls and completion state.
- `app/(tabs)/workouts.tsx`: route-level Design Preview/real-data split preserving the current premium preview.
- `app/workout-history.tsx` and `app/workout-records.tsx`: history and personal-record destinations.
- `app/workout-session.tsx`: route entry that preserves existing deep links while using the new session flow.

## Design decisions

**Design movement:** editorial performance training with a premium dark athletic dashboard (probability 0.06). Alternative: clinical training ledger (0.08). Alternative: bright wellness journal (0.04).

**Core principles:** keep plan choices visible; make one active exercise the clear focal point; show logged sets as real records, not sample metrics; make replacement, skipping and completion reversible or explicit.

**Color philosophy:** black and charcoal provide calm focus; electric green marks active progress and completed sets; muted lavender, orange and blue distinguish strength, volume and recovery cues without overwhelming the screen.

**Layout paradigm:** a vertical training flow with a compact plan rail above the active exercise card, followed by set rows and a clear next action; history and records use timestamped ledgers rather than dense tables.

**Signature elements:** green active-set edge accents, compact exercise metadata chips, and a high-contrast “next set” action.

**Interaction philosophy:** choose a goal and structure, inspect the generated plan, start explicitly, log one set at a time, and never silently mark an exercise or workout complete.

**Animation:** use existing reduced-motion-aware transitions for plan expansion and completion feedback; no animation may delay a save, hide a retry state or imply a set was logged when it was not.

**Typography and voice:** preserve the existing concise athletic hierarchy with copy such as “Build the session around your goal.” and “Log what you actually lifted.”

**Brand essence:** an AI-ready training operating system for people who want clear next actions tied to their goal, equipment and real history. Personality: precise, motivating, grounded.

## Safety and data boundaries

Exercise demonstrations are optional metadata and may be absent; the interface must show a safe text instruction instead of a broken media placeholder. Equipment filters prevent unsupported selections where possible, but users remain responsible for form, load and medical clearance. Set weights and repetitions are user-entered records; no synthetic performance data is written. Personal records are estimates derived from completed logged sets and are labeled accordingly.
