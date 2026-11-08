# BodyIQ AI

**Your Body. Your Goals. Your AI Coach.**

BodyIQ AI Phase 1 is a professional cross-platform fitness app foundation. It uses TypeScript, React Native, Expo Router and NativeWind with an Express/tRPC API, Drizzle ORM and Manus-managed MySQL-compatible cloud data. This is a real source-code project, not a static screen mockup.

## Phase 1

The app includes branded splash/welcome screens, reusable dark/green UI, five-tab navigation, Home/Nutrition/Workouts/Progress/AI Coach placeholders, functioning navigation and concept previews, secure Manus OAuth, and a basic cloud profile editor. The profile persists a display name, broad fitness goal, country code and preferred units. Guests can explore without saving personal data.

Advanced meal logging, calorie estimation, workout generation, health measurements, AI chat and coaching are deliberately not active. Empty charts contain no fabricated data. Future-domain database tables are schema foundations only.

## Premium interface upgrade

The existing project now includes polished Welcome, Login, Registration, Home, Nutrition, Food Scanner, Workouts, Progress, AI Coach, Profile, Settings and support screens. The five-tab fitness navigation remains intact. Login/Registration use the preserved OAuth provider; Profile still saves real authenticated basic account data to the cloud.

Design Preview shows explicitly labeled, local-only sample data. The banner eye control and Settings switch hide samples and restore empty states. Scanner results and Coach conversations are predefined design demos, not live recognition or AI. Preview preferences are device-local and samples are never seeded into the database. Read `docs/INTERFACE_REPORT.md` for screen and interaction checks, completed refinements and release-stage limits.

## Run inside the Manus project

The Dashboard Preview is connected to this project's Expo/Metro runtime. Managed environment values are supplied by Manus. Do not paste credentials into source files or chat.

```bash
pnpm install --frozen-lockfile
# Run when creating a fresh database or applying committed schema changes:
pnpm db:push
pnpm dev
```

The migration has already been applied to this project's managed database. Do not recreate or reseed existing user data. The database is shared by development and production.

The supported runtime has Metro on port 8081 and the API on port 3000. `pnpm dev:metro` and `pnpm dev:server` can run individually when one listener is already healthy. Do not set CI mode for resident Metro because it disables live reloading.

```bash
pnpm check
pnpm test
pnpm build
# A finite web-bundle check, not an Android/iOS release build:
CI=1 pnpm exec expo export --platform web --output-dir /tmp/bodyiq-web-export
```

## Source access

All app, server, schema, migration, tests and configuration files are in the Manus-managed project. The source archive includes this code and lockfile but excludes dependencies, build caches, signing material and environment secrets. Open the project source/files view to inspect or continue editing. Mobile canonical source remains Manus-managed for Dashboard native builds; exporting a backup does not move it to another canonical repository.

The archive can also be extracted into your editor. Install the pinned pnpm toolchain and dependencies, and supply valid environment values described in `.env.example`. The archive does not embed a private database connection or grant access to the project’s cloud resources by itself.

## Android and iOS

Use the Dashboard **Connect Expo** form for Expo credentials; never place the token in chat or Git. Sign into Expo Go on the phone with that same account. Dashboard device Preview requires both runtime listeners and the synchronized credential environment. Device integration, OAuth deep links and native behavior need real-device verification before release.

From an accepted source checkpoint, Dashboard builds can produce Android APK/AAB or iOS/TestFlight artifacts. Android store distribution requires a Google Play developer account and signing setup. iOS distribution requires Apple developer access, signing/provisioning and App Store Connect/TestFlight setup. A production build must point to a deployed, reachable API rather than a temporary development listener.

No signed native release artifact, store submission or production backend publication is claimed in Phase 1. Publishing the API, setting the production API origin, device checks, signing and native Dashboard builds are the next release steps.

## Architecture

Read `docs/ARCHITECTURE.md` for the project structure and security boundaries, `docs/DATABASE.md` for ownership and migration details, and `docs/PHASE1_REPORT.md` for the implementation results and known verification limits.
