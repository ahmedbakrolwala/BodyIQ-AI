# BodyIQ AI — Phase 1 report

BodyIQ AI now has an executable, maintainable cross-platform mobile foundation with a premium dark interface and persistent cloud profile storage. The tagline is **Your Body. Your Goals. Your AI Coach.** The experience is designed for global users, starting with India, using portrait-first native components and responsive layouts.

## Selected technologies

The application uses **TypeScript, React Native, Expo Router and NativeWind**, not Flutter. React Native components share the Android/iOS codebase, and Expo Web supplies the development preview. React Query and tRPC provide a typed frontend/backend boundary. Shared palette tokens and reusable components define black backgrounds, white text, electric green accents, modern cards, tap feedback, and reduced-motion-aware entrance animations.

The backend uses **Node.js, Express and tRPC**, with Zod request validation. **Drizzle ORM and Manus-managed MySQL-compatible cloud storage** provide durable data and committed migrations. Manus OAuth supplies real account authentication. No external AI provider key is required or requested during this foundation phase because the AI Coach is deliberately not connected yet.

## Delivered screens and interactions

The app includes a branded splash screen with its exact tagline, a welcome screen with secure sign-in and guest exploration, and five-tab navigation for **Home, Nutrition, Workouts, Progress, and AI Coach**. Native launcher, splash, favicon, adaptive foreground/background and monochrome assets are configured under the preserved generated app identifiers.

Home establishes the daily dashboard, current-week date strip, activity and nutrition empty states, profile shortcut, workout concept card, navigation shortcuts, and a real cloud connectivity indicator. Nutrition establishes calorie/macro, daily meal, and hydration layouts with day selection. Workouts includes category filters and clearly labeled concept previews. Progress includes professional empty-state charts with metric and time-range controls. AI Coach introduces the future experience with a roadmap preview and profile shortcut; it does not simulate a conversation or generate advice.

The profile editor is the functional cloud-data demonstration. After authentication, a user can save their display name, broad goal, ISO country code and preferred units. Loading, validation, connection failures, retry and successful-save states are present. India and metric units are the initial defaults. Guests cannot access private profile data.

## Persistent data and security

The applied schema includes `users`, `userProfiles`, `nutritionEntries`, `workoutSessions`, `progressEntries`, and `coachConversations`, plus Drizzle migration history. Future fitness tables are empty schema foundations, not active feature implementations. The basic profile table has a unique user foreign key and timestamps. Private reads and writes derive ownership from the validated server session, never a submitted client user ID.

OAuth uses short-lived nonce-bound browser state and cryptographically signed native verifier state. Session checks enforce HS256 signatures, expiry and project identity. Native session tokens use Expo SecureStore. Browser sessions use server-set HttpOnly cookies. Database credentials, signing secrets and managed service credentials are not placed in frontend bundles or the downloadable source archive.

Data is in a real managed cloud database, not browser storage or local server JSON. The local entry preference only controls whether to replay the welcome screen; it is not a substitute for cloud persistence. Development and production share the managed database, so migrations and subsequent data changes must be treated carefully.

## Source access and running the project

All source is accessible in the Manus project’s source/files view and maintained in its canonical repository. A downloadable source archive contains app screens, reusable components, server code, schemas, migrations, tests, native assets, lockfile and documentation. It excludes credentials, dependencies, caches and signing material.

Open **Preview** in Manus to use the running app. Choose **Explore the app** to inspect Phase 1 without an account, or sign in to use the profile editor. For device preview, use Dashboard **Connect Expo** and Expo Go with the same account. Expo credentials must be entered through the Dashboard, not chat.

The project runs with `pnpm dev`, which starts Metro on 8081 and the API on 3000. Managed environment values are supplied by Manus. `pnpm db:push` establishes or updates schema through committed migrations; it has already succeeded for this project. `pnpm check`, `pnpm test`, and `pnpm build` provide the standard checks. See `README.md`, `docs/ARCHITECTURE.md`, and `docs/DATABASE.md` for further details.

The source archive is portable code, but it does not by itself supply a private database connection or access to Manus cloud resources. Outside Manus, valid infrastructure and environment configuration are required.

## Verification and remaining release work

TypeScript checking and backend compilation pass. The test suite passes **38 tests**, with **one pre-existing logout test skipped**. Expo JavaScript exports have passed for web, Android and iOS. The web export includes all app routes; native bundle export is not a signed release build. Runtime HTTP checks confirm Metro responds with 200, the foundation endpoint responds with 200 and `databaseReachable: true`, unauthenticated private-profile access returns 401, and OAuth initiation returns 302. Schema migration success and live table discovery confirm the cloud foundation exists.

No fabricated user or health records were inserted to demonstrate persistence. Ownership and profile saves are covered by deterministic API tests with mocked repository boundaries; a live end-to-end signed-in profile write and provider redirect round trip have not been manually exercised. Actual Android/iOS devices, accessibility screen readers, haptics and native deep links have not been physically tested. JavaScript bundle validation is not equivalent to a signed native release or real-device verification.

The next release steps are to publish a reachable production API, configure the release API origin, connect signing/developer accounts, verify OAuth and the profile flow on real devices, and build from the accepted checkpoint using the Dashboard. Manus can produce **Android APK/AAB** and **iOS/TestFlight** artifacts. Google Play distribution requires the relevant developer account and signing setup; iOS distribution requires Apple developer access and signing/provisioning. No signed release artifact, store submission or production API publication is claimed in Phase 1.

## Deliberately deferred

AI chat, personalized coaching, meal logging, calorie estimation, workout generation, progress logging, device health integrations, subscriptions and notifications are not implemented. This respects the request to build the foundation first. BodyIQ AI is not a medical service, and Phase 1 generates no health advice.
