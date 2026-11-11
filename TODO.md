# BodyIQ AI — Delivery Checklist

## Phase 1 foundation

- [x] Create the application project, scalable architecture, folder structure, environment configuration and maintainable source foundation using TypeScript, React Native and Expo Router; keep complete source accessible for Android/iOS-compatible layouts.
- [x] Build reusable UI components with premium black/charcoal backgrounds, white typography, electric-green accents, modern cards, accessible states, smooth animations and responsive mobile spacing.
- [x] Implement branded splash and welcome screens, five-tab navigation for Home, Nutrition, Workouts, Progress and AI Coach, and placeholder layouts without advanced features.
- [x] Configure persistent Manus-managed cloud database architecture, server APIs, secure authentication and private profile persistence.
- [x] Validate runtime, TypeScript/build, platform JavaScript exports and provide Phase 1 handoff documentation.

## Premium interface upgrade

- [x] Preserve the existing project, OAuth, cloud profile editing, schemas and navigation while adding polished Welcome, Login, Registration, Home, Nutrition, Food Scanner, Workouts, Progress, AI Coach, Profile, Settings and support screens.
- [x] Keep bottom navigation and all visible navigation links functional. Use realistic sample data only in clearly labeled, device-local Design Preview mode; never write sample fitness or coach data to the database.
- [x] Test requested screens and interactions at narrow and regular mobile sizes, with browser/device verification limits stated honestly.

## Authentication upgrade

- [x] Implement backend-connected email/password registration, verification/resend, login/logout, forgot-password, single-use reset, persistent cross-platform sessions and account deletion with loading/error states.
- [x] Never store plaintext passwords; use salted memory-hard hashing, secure cookies/native storage, revocable sessions, hashed short-lived action tokens, ownership checks and account-scoped deletion.
- [ ] Configure Google OAuth and verification/reset email delivery and complete live provider tests. BLOCKED because protected provider credentials were not supplied; do not reopen without a new request.

## Fitness onboarding

- [x] Collect age, height, current weight, optional target weight, experience, primary goal, activity level, gym/home preference, equipment, dietary preference, allergies and measurement units in a mobile-friendly flow.
- [x] Save validated canonical values to a private user-owned cloud profile, calculate conservative estimated calorie/macronutrient targets, display/edit the profile and personalize dashboard, nutrition and workout guidance while respecting diet, allergies and equipment.

## Functional home dashboard

- [x] Authenticated Home displays database-backed calorie target, consumed and remaining calories; protein, carbohydrates and fat consumed/target; today’s workout; weekly frequency; current weight and recent progress without hardcoded sample numbers.
- [x] Persist meals, workout sessions and weights with owner-scoped validation, idempotent writes, time-zone-aware aggregation and automatic refresh after mutations, profile changes, foregrounding and return to Home.

## AI food scanner

- [x] Provide authenticated camera capture and gallery upload through Expo ImagePicker, native permission copy, browser gallery fallback, clear cancellation/permission/error states and a manual logging link.
- [x] Send photos only through the protected backend to the built-in Manus vision-capable LLM runtime. Keep credentials out of frontend bundles; allow optional server-only `FOOD_SCANNER_MODEL` selection only when present in the managed catalog.
- [x] Return validated likely food items and ingredients, estimated serving size, calories, protein, carbohydrates and fat, confidence and uncertainty notes. Label all values as estimates and return no nutrition for unclear images rather than fabricating results.
- [x] Let users edit food name, serving size, meal type and every nutrition estimate before confirmation.
- [x] Confirm and save a corrected meal through the existing owner-scoped `tracking.logMeal` mutation and refresh daily nutrition totals. Preserve the draft/client ID for retry.
- [x] Preserve scanner/manual logging navigation and validate backend MIME/size/auth boundaries, clear/unclear/invalid model outputs, native config, browser gallery → estimate → edit → confirm flow and service-failure states without writing test data to the cloud.

## Nutrition system

- [x] Support breakfast, lunch, dinner and snack sections in the authenticated nutrition experience, with daily calorie and macro totals sourced from the user’s real food logs.
- [x] Provide authenticated food search against a server-owned Indian/international catalog with vegetarian and non-vegetarian options, estimated nutrition and ingredient quantities; keep catalog values clearly labeled as estimates.
- [x] Preserve manual food logging and add owner-scoped meal editing and deletion with confirmation, validation, idempotent/retry-safe behavior and automatic dashboard total refresh.
- [x] Generate one-day, seven-day and thirty-day meal plans personalized from the saved fitness goal, derived calorie/macronutrient targets, dietary preference and allergies; support vegetarian/non-vegetarian choices and Indian/international cuisine.
- [x] Support budget-based plan selection, ingredient quantities and estimated nutrition, saved plans and grocery lists derived from saved plan meals.
- [x] Persist saved plans, plan meals and grocery lines to the managed database with additive migration `0005_empty_shinobi_shaw.sql` and strict per-user ownership; no test health data was seeded.
- [x] Preserve scanner/manual logging, existing dashboard, authentication, onboarding and Design Preview; validate mobile route compilation, loading/error/empty states, ownership contracts and all plan durations through checks and focused tests.

## Workout generator and tracking

- [x] Allow users to choose muscle gain, fat loss, strength or general fitness; support gym and home workouts; support full body, upper/lower split, push/pull/legs and individual muscle-group workouts.
- [x] Generate an owner-scoped workout plan whose exercises display name, target muscles, instructions, sets, repetitions, rest time, equipment and an optional demonstration where available.
- [x] Let users start a generated workout, log sets/repetitions/weights, replace exercises, skip exercises and complete workouts explicitly; keep loading, retry, conflict and failure states honest.
- [x] Save active and completed workouts, plan snapshots and set logs to the managed database with strict user ownership and idempotent start/completion behavior.
- [x] Provide workout history and personal records derived from completed logged sets, with estimated-record labeling and no fabricated performance data.
- [x] Preserve the existing dashboard, nutrition, scanner, authentication, onboarding and Design Preview; validate generator filters, equipment/location constraints, set logging, replacement/skip/completion flow, history/records, mobile layouts and ownership boundaries.

## Evidence

The delivered system has healthy Metro/API listeners, 102 passing regression tests across 20 files, passing TypeScript/lint/build, `drizzle-kit check`, and web/Android/iOS exports. The workout migration is applied and `pnpm db:push` reports no schema changes. The public browser verified that the guest Workouts route remains an explicit Design Preview and does not record sessions. See `docs/WORKOUT_REPORT.md`, `docs/NUTRITION_REPORT.md`, `docs/FOOD_SCANNER_REPORT.md` and the updated `plan.md` for evidence and architecture.
