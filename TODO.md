# BodyIQ AI — Phase 1

- [x] Create the application project, scalable architecture, folder structure, environment configuration, and maintainable source-code foundation using Manus’s supported mobile stack. Keep complete source accessible. Target global users, initially India, and Android/iOS-compatible responsive layouts.
- [x] Build a reusable design system and UI components with premium black backgrounds, white typography, electric green accents, modern cards, accessible states, smooth animations, and a minimal clean interface.
- [x] Implement a branded splash screen featuring BodyIQ AI and the tagline “Your Body. Your Goals. Your AI Coach.” Create distinct launcher/splash/adaptive icons.
- [x] Implement a responsive welcome screen introducing the product and providing Phase 1 entry actions.
- [x] Create main mobile navigation for Home, Nutrition, Workouts, Progress, and AI Coach.
- [x] Build responsive Home and Nutrition placeholder layouts establishing dashboard and tracking interfaces without advanced functionality.
- [x] Build responsive Workouts and Progress placeholders with professional chart placeholders and empty states.
- [x] Build a responsive AI Coach placeholder clearly presenting future coaching without activating AI features.
- [x] Configure persistent cloud database architecture, secure authentication and server-side APIs. Persist only a basic user profile in Phase 1; do not implement advanced fitness or AI capabilities.
- [x] Ensure Phase 1 runs across supported mobile viewport sizes with accessible interaction patterns and Android/iOS-compatible code.
- [x] Provide a Phase 1 report with language/framework, backend/database, architecture, source access, run instructions, completed results and eventual Android/iOS packaging. Prepare accepted source checkpoint and downloadable source without secrets.
- [x] Read-only implementation review by a validation agent; resolve confirmed issues.

## Evidence

Managed schema migration applied; cloud reachability verified; TypeScript and backend builds pass; 38 tests pass, one starter test skipped; web/Android/iOS JavaScript exports pass. Read-only review findings for Expo Go callbacks, shared scheme identity and auth transport errors were corrected with targeted regression tests. Physical-device OAuth/profile round trips and signed releases remain release-stage checks, not claims of Phase 1 testing. Source checkpoint and archive are prepared at handoff.

# Premium interface upgrade

- [x] Continue the existing BodyIQ AI project without creating a new project or removing working OAuth, cloud profile editing, schemas or navigation features.
- [x] Polish the Welcome screen and add dedicated Login and Registration routes connected to the existing secure account provider.
- [x] Build premium Home, Nutrition, Workout, Progress and AI Coach interfaces with black/charcoal surfaces, electric-green highlights, modern typography, professional fitness icons, consistent spacing, reusable components and responsive mobile layouts.
- [x] Add the Food Scanner screen with functional entry/back navigation and an explicitly labeled sample scan flow; do not claim working AI food recognition or collect images without consent.
- [x] Extend Profile with functional Settings navigation, preview preferences, help/privacy destinations, and preserve the real authenticated profile save and sign-out actions.
- [x] Preserve bottom navigation for main screens. Make every navigation link and visible enabled action functional, including preview detail interactions and empty-state recovery paths.
- [x] Use realistic sample data only for the design preview. Show persistent sample labels, offer a switch to empty-state mode, and never write sample fitness or coach data to the real user database.
- [x] Test every requested screen and fix layout problems at narrow and regular mobile sizes. Check route, interaction, data-isolation and TypeScript/build regressions, stating native-device verification limits.

## Interface verification evidence

Every requested screen rendered in mobile Preview. Browser navigation, scanner/meal/workout demos, chart filters, Coach prompt and typed-message flows, settings switches, support links and sample-to-empty-state transitions passed. TypeScript, interface lint, backend compilation and 44 tests pass; one existing logout test remains skipped. Web/Android/iOS JavaScript exports pass. No real health or test user records were written; physical-device and signed-release checks remain unverified. See docs/INTERFACE_REPORT.md for details.

# Complete authentication upgrade

- [x] Add backend-connected Google sign-in and email/password registration while preserving the existing design, navigation, Manus sign-in and real private profile data.
- [x] Implement email verification, login/logout, forgot password, single-use password reset and persistent cross-platform sessions, with proper errors and loading indicators.
- [x] Never store plaintext passwords. Use salted, memory-hard password hashing, secure cookies/native storage, persisted revocable sessions, rate limits and hashed short-lived action tokens.
- [x] Store profiles securely and enforce authenticated ownership on every private operation. Add confirmed account deletion with recent reauthentication and cascading deletion/revocation.
- [x] Test registration, verification, login, logout, password reset, token replay/expiry, ownership and account deletion using isolated test dependencies; do not bypass production auth or write fake health data.
- [x] Validate TypeScript, maintained UI/navigation, database migrations, runtime readiness and platform bundles. Report live provider/device verification limits honestly.
- [ ] Configure Google OAuth and verification/reset email delivery and complete live end-to-end provider tests. BLOCKED: user cancelled the protected credential form; do not reopen it without a new user request. Google client ID/secret and Resend sender/key are not configured.

## Authentication verification evidence

67 tests pass across 11 suites, including real scrypt and signed-JWT HTTP lifecycle tests. TypeScript, targeted lint, backend build and final web/Android/iOS JavaScript exports pass. Eight additive cloud auth tables are ready; API/Metro return HTTP 200. Provider-dependent routes return clear 503 configuration errors. The read-only review findings were corrected with atomic reset/deletion, owned revocable SID transport, strict auth body limits, persistent throttles, legacy callback protection and logout consistency. Live Google/email delivery, physical-phone OAuth and signed releases remain unverified until provider setup. See docs/AUTH_BACKEND.md.

# Fitness onboarding

- [x] Mobile step-by-step onboarding collects age, height, current weight, optional target weight, experience, primary goal (muscle gain, fat loss, maintenance, strength, general fitness), activity, gym/home, equipment, diet, allergies and metric/imperial units.
- [x] Store validated canonical metric values in a private user-owned cloud profile; display/edit saved information and recalculate estimated calorie/macronutrient targets on edit. Preserve existing account/profile features.
- [x] Personalize dashboard, meal plans and workout guidance from saved profile, separating sample previews from real recommendations. Apply dietary/allergy/equipment restrictions and conservative estimation limits.
- [x] Validate ownership, inputs, conversions, calculations and mobile flow; apply additive migration and save maintainable source. Do not bypass authentication or seed personal data.

Verification: 77 tests pass; TypeScript/lint/backend build and final web/Android/iOS JavaScript exports pass. Cloud migration 0003 is applied. Five-step browser-only fixture save/edit tests pass with no live health records written. Review findings corrected; physical-phone checks remain unverified. See docs/ONBOARDING_REPORT.md.

# Functional home dashboard

- [x] Real-user Home displays daily calorie target, consumed and remaining calories; consumed/target protein, carbs and fat; today's workout; completed weekly frequency; current weight and recent progress. No sample numbers are used in the authenticated dashboard.
- [x] Database-backed meal logging, workout start/completion and weight update actions drive the dashboard. Scanner navigation remains functional and explicitly labels any scanner demo as non-recorded sample data.
- [x] Secure authenticated ownership, validation, idempotent writes and time-zone-aware daily/weekly aggregation; preserve existing auth, onboarding, profiles and design.
- [x] Automatically refresh after food/workout/weight/profile mutations, on return to Home and foreground; cross-device polling/retry states, no fabricated fallbacks or stale private-account data.
- [x] Validate isolated tracking operations, totals/boundaries/ownership and mobile navigation; migrate additive tables and deliver source/report with clear verification limits.

Verification: additive tracking migration 0004 applied; 90 tests across 17 suites pass; TypeScript/lint/backend build pass; cross-platform JavaScript exports checked. Browser-only fixture verified meal, zero-value, weight and workout saves and Home refresh without live health writes. See docs/DASHBOARD_REPORT.md for limits.
