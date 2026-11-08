# BodyIQ AI — architecture

BodyIQ AI is a cross-platform mobile application built with TypeScript, React Native, Expo Router and the Manus-managed Expo starter. NativeWind is configured for shared styling; a typed token palette and React Native StyleSheet implement the premium dark design. Expo Web is a development surface, not a separate website rewrite.

The frontend communicates through tRPC and React Query with a Node.js/Express API. Zod validates inputs. Drizzle ORM owns the MySQL-compatible cloud schema and committed migrations. The database is managed by Manus and persists across server restarts. Development and production share this database, so schema and data operations must be handled as real changes, not disposable test setup.

## Project structure

```text
app/
  index.tsx                 Animated splash and local entry preference
  welcome.tsx               Branded introduction, sign-in, guest exploration
  profile.tsx               Protected cloud profile editor
  (tabs)/                   Home, Nutrition, Workouts, Progress, AI Coach
  oauth/callback.tsx        Authentication callback and recovery
components/bodyiq/
  ui.tsx                    Logo, screen, card, button, badges, empty states
  charts.tsx                Honest empty-state activity and progress charts
  roadmap-modal.tsx         Future-feature previews without simulated functionality
constants/
  design.ts                 Typed color and brand tokens
  oauth.ts                  Public OAuth and API configuration
hooks/                      Authentication and theme hooks
lib/
  trpc.ts                   Typed API transport and credential handling
  sign-in.ts                Cross-platform secure OAuth initiation
  _core/                    Supplied runtime and secure storage adapters
server/
  routers.ts                Typed API composition
  routers/profile.ts        User-owned profile procedures
  repositories/profile.ts   Database data-access boundary
  _core/                    Express, OAuth, sessions and service adapters
shared/                     Browser-safe shared validation and contracts
drizzle/                    Schema, relations and versioned migrations
assets/images/              Native branding assets
 tests/                     Deterministic API/security coverage
 docs/                      Architecture, database and handoff notes
```

## Data and ownership

The Phase 1 application saves only a basic signed-in profile: name, broad fitness goal, country code and preferred units. Every private API operation derives ownership from the authenticated server context, never a client-supplied user ID. Authentication user records are created by the real OAuth integration. Guests can explore placeholder screens but cannot read or save a private profile.

The schema establishes separate future domains for nutrition entries, workout sessions, progress entries and coach conversations. Those tables have no active feature endpoints or seed health data in Phase 1. Placeholder charts display dashes and explicit empty states, not invented measurements.

## Security boundaries

Database credentials, JWT signing secrets and managed service credentials remain server-side. Only public app identity, OAuth portal information and the configured API address are bundled into the app. Native sessions use Expo SecureStore; web sessions use server-set HttpOnly cookies. Server-side session checks validate signatures, expiry and project identity. OAuth uses nonce-bound state rather than trusting callback query data.

Backend processes can scale independently of the mobile bundle. Profile writes use database upserts keyed by user ownership. Cloud database storage, rather than process memory or local JSON files, is the source of truth. Future features can add dedicated routers/repositories and background jobs without coupling the screens to database access.

## Runtime and packaging

Metro/Expo runs on port 8081, and the API runs on port 3000. Public addresses are platform-supplied; no temporary preview hostname is hardcoded. Production mobile builds require a deployed reachable API and configured public app values, not a development machine listener.

Manus retains the canonical mobile source repository. Accepted checkpoints are the inputs for Dashboard Android APK/AAB and iOS/TestFlight builds. Signing credentials, developer accounts, native-device checks and store submission remain separate release steps. Phase 1 does not contain a signed store artifact or a medical coaching model.
