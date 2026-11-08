# BodyIQ AI — functional Home dashboard

## Delivered

Signed-in Home now renders the user's database-backed dashboard instead of sample metrics. The existing dark/electric-green design, tabs, authentication and onboarding remain intact. Guest Home retains a clearly labeled design preview in a separate component; changing the preview preference cannot replace authenticated Home with sample values.

The dashboard displays daily calorie target, consumed and remaining calories, protein/carbohydrate/fat consumption and targets, today's active/completed workout or clearly identified suggested session, completed sessions and training days this Monday–Sunday week, current saved weight, recent weight/workout progress and today's meal history. Targets are the existing onboarding estimates, not hardcoded sample values. Missing targets or weight stay unknown. Empty consumption/frequency aggregates are genuine zeros. Zero consumption means no saved meal entries, not proof of fasting. Calories beyond the target are shown separately; exercise does not automatically inflate calorie allowances.

## Functional logging

Home and existing Nutrition/Workouts/Progress routes link to real meal, workout-session and weight logging. Meal logging saves the name, type and explicitly entered calories/macros; blank or invalid input is not silently converted to zero, while explicitly entered zero values are valid. Meal values come from the user's known label/source, not AI estimates. Workout start stores a snapshot of the saved plan; only an explicit completion action records a completed session. There are no fabricated duration, completion or calorie-burn values. Weight entry converts metric/imperial measurements into canonical kilograms and updates the fitness profile so future targets use the current saved measurement.

Food Scanner navigation works, and manual logging is available from that screen. Its existing photo/barcode recognition interface remains a clearly labeled design demo. It does not silently write sample nutrition to real records; camera/AI recognition was not added in this dashboard phase.

## Database and correctness

Additive migration `0004_certain_meltdown.sql` creates `foodLogs`, `trainingLogs` and `weightLogs`, with authenticated owner IDs, cascade deletion, owner/time indexes and unique owner/client request keys. Existing placeholder and profile tables are preserved. Protected tRPC procedures expose `tracking.get`, `logMeal`, `startWorkout`, `completeWorkout` and `logWeight`; callers cannot select another user's owner ID.

All timestamps are server-generated. IANA device time zones determine half-open local-day and Monday-week bounds, including daylight-saving transitions. Frequency reports both completed sessions and distinct training days. The summary prefers an existing active workout, even if started on a previous day, otherwise today's most recent completion; a suggested plan is labeled as a suggestion.

Unique-key race recovery returns the owned existing operation on an identical retry and rejects changed payloads. Concurrent active starts resolve to the user's existing active workout. Completion locks the owned row and updates only pending state, preventing double-counted completion. Recent queries and the active/today lookup are bounded rather than loading all workout history.

Profile and weight updates serialize on the stable owner row. An explicitly confirmed full fitness-profile save and a weight-log save follow a last-confirmed-save policy; a new or changed profile measurement appends a real baseline/weight event, while unrelated unit changes preserve weight through JSON_SET. Retrying an older weight request does not overwrite a newer saved measurement. This is not an optimistic-version editor; users should review measurements before confirming an edited profile.

## Refresh and privacy

Successful tracking, fitness and basic-profile mutations invalidate the dashboard. It also refreshes when returning to Home, foregrounding/reconnecting the app, and every 30 seconds while active for other-device changes. Native focus integration pauses background polling. Failed reads show a retry state or label the last successful data as stale—never sample values. Per-user React component keys reset unsaved tracking drafts when accounts change; draft fields are frozen during a pending/ambiguous submission so retries keep the same payload and request ID. Drafts are not saved to plaintext device storage.

## Verification

The real cloud migration and all three tracking tables were verified without seeding or writing test health data. API and Metro return HTTP 200. TypeScript, lint and backend build pass. The full suite passes **90 tests across 17 suites**, including isolated repository aggregation, owner/time SQL predicates, macro totals, unknown targets, calorie overshoot, weekly distinct days, active precedence, duplicate recovery, weight synchronization, form-refresh metadata and daylight-saving boundaries, plus existing authentication/onboarding regressions.

A temporary browser-only fixture exercised authenticated Home, blank meal rejection, valid meal/zero-calorie entries, weight save, workout start/completion, and automatic return-to-Home refresh of calories, weight, frequency and progress. The fixture blocked real writes and was removed afterward. An initial fixture failure was traced to its single-response handling of multiple tRPC refetches; a batch-aware fixture verified the actual refresh behavior. Narrow mobile loading/error navigation layouts were inspected. Final web, Android and iOS JavaScript exports are validated; no signed native release or physical-device database round trip is claimed.

Live Google/email activation still depends on the provider setup described in the prior authentication handoff. Existing Manus authentication remains available; the new dashboard itself requires no new external keys.

## Source access

The complete updated source stays in the existing BodyIQ AI Manus project and includes shared contracts/date helpers, protected repositories, migration, reusable components, routes, refresh hooks and tests. A downloadable source archive excludes credentials, dependencies, generated builds and signing material.
