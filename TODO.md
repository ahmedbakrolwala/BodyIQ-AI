# BodyIQ AI — Delivery Checklist

## Phase 1 foundation

- [x] Create the application project, scalable architecture, folder structure, environment configuration and maintainable source foundation using TypeScript, React Native and Expo Router; keep complete source accessible for Android/iOS-compatible layouts.
- [x] Build reusable UI components with premium black/charcoal backgrounds, white typography, electric-green accents, modern cards, accessible states, smooth animations and responsive mobile spacing.
- [x] Implement branded splash and welcome screens, five-tab navigation for Home, Nutrition, Workouts, Progress and AI Coach, and placeholder layouts without advanced features.
- [x] Configure persistent Manus-managed cloud database architecture, server APIs, secure authentication and basic private profile persistence.
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
- [x] Preserve scanner/manual logging navigation. Validate backend MIME/size/auth boundaries, clear/unclear/invalid model outputs, native config, browser gallery → estimate → edit → confirm flow and service-failure states without writing test data to the cloud.

## Evidence

The current project has a healthy Metro listener on port 8081 and API health endpoint on port 3000. The scanner endpoint rejects an unauthenticated request with HTTP 401. The scanner test suite covers secure storage upload, signed image URL handoff, structured vision output, unclear results, invalid/oversized/unsupported input, invalid model output and protected router access. Full regression suite: 94 tests passed across 18 files. TypeScript check, targeted lint, server build and web/Android/iOS Expo exports passed. Browser fixture verified gallery input, structured estimate rendering with ingredients, editable values, confirmation and dashboard refresh from 0 to 390 kcal consumed / 1,710 kcal remaining; fixture was reloaded and no real user or health records were written. Native camera permission and signed release builds remain physical-device/release-stage checks. See `docs/FOOD_SCANNER_REPORT.md`.
