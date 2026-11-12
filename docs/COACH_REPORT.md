# BodyIQ AI Coach

The authenticated Coach now uses a protected backend conversation flow. Guests and Design Preview users continue to see the scripted preview; signed-in users get a real mobile chat surface with persisted history, loading states, retry behavior and service-error handling.

## Backend

`shared/coach.ts` defines bounded strict contracts. `server/routers/coach.ts` exposes protected `history` and `send` procedures and always derives ownership from the authenticated session. `server/services/coach-context.ts` reads only the caller’s fitness profile, recent approved food logs and completed workouts. Missing information is explicitly represented as unknown rather than inferred. `server/services/coach-ai.ts` calls the built-in Manus LLM through the server-only service API, validates the configured model against the live catalog, and applies a safety prompt covering general fitness guidance, no diagnosis or medication advice, conservative injury handling and clinician escalation.

Coach messages are stored in the additive `coachMessages` table linked to the existing user-owned conversation with cascade deletion. History is bounded to 100 messages, and the client never supplies a user ID or provider credential.

## UI

The Coach screen preserves the premium black/charcoal and electric-green visual system. The live experience includes suggested prompts, chronological user/assistant bubbles, a 2,000-character composer, disabled/loading send state, saved-history loading/error states, retry support and concise privacy/safety copy. The guest preview remains clearly labeled as scripted and unsaved.

## Verification

The additive migration `drizzle/0007_clammy_black_crow.sql` was generated and applied through the managed database workflow. `drizzle-kit check`, TypeScript checks, lint, the full regression suite (20 files, 102 tests), backend build, web/Android/iOS Expo export, Metro and API health checks all completed successfully. No live user message was created during verification, and no provider credential is exposed to the frontend.

The Coach still requires the project’s managed Manus LLM service credentials at runtime. No separate external AI key is required when the built-in service is enabled. The optional `COACH_MODEL` server environment value may select a model only after catalog validation; otherwise the supported low-cost default is selected server-side.
