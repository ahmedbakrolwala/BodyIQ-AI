## AI Coach implementation approach

The authenticated Coach route will preserve the current local-only Design Preview for guests and use a real protected conversation for signed-in users. A server-owned context builder will read only the caller’s fitness profile, recent approved food logs and completed workout history/records. It will normalize those records into a compact, bounded context with explicit “unknown” values instead of filling gaps with assumptions. The client sends only the user’s message and an optional conversation cursor; it never sends a user ID or provider credential.

The backend will persist chat turns in new owner-scoped coach message tables, call the built-in Manus LLM through `server/_core/llm.ts`, validate the response, and save the assistant turn only after a successful response. The system prompt will require practical plain-language answers, distinguish recorded data from estimates, avoid diagnoses or medication advice, refuse unsafe injury guidance, recommend a clinician for medical concerns, and say when the available profile/history is insufficient. Inputs and stored context will have strict length and history limits to control cost and prevent prompt abuse. The model will be selected from the live catalog and configured server-side, defaulting to the low-cost current supported chat model `gpt-6-luna` because it is listed, non-deprecated, low-cost and supports the required instruction-following/chat behavior.

## Coach project structure

- `shared/coach.ts`: strict message, context, history and response contracts with bounded input schemas.
- `server/services/coach-context.ts`: owner-scoped profile, approved nutrition and workout context builder with no fabricated fallbacks.
- `server/services/coach-ai.ts`: safe system prompt, server-only `invokeLLM`, model selection and response normalization.
- `server/repositories/coach.ts`: owner-scoped message persistence, bounded history and cascade-safe deletion integration.
- `server/routers/coach.ts`: protected `history` and `send` procedures; no client-supplied user IDs.
- `drizzle/schema.ts` plus additive migration: coach conversations/messages and indexes.
- `app/(tabs)/coach.tsx`: authenticated real chat / guest Design Preview split with loading, retry and privacy states.

## Coach design decisions

**Design movement:** calm performance mentorship inside the premium dark athletic dashboard (probability 0.07). Alternative: clinical consultation log (0.05). Alternative: energetic accountability feed (0.06).

**Core principles:** answer the question first; show what is grounded in records versus general guidance; keep medical boundaries visible but unobtrusive; never turn missing data into a fictional progress review.

**Layout paradigm:** a chronological conversation rail with a compact context/status header and a bottom composer; long answers are grouped into short readable sections rather than dense cards.

**Signature elements:** a green “grounded in your profile” badge, concise safety note when relevant, and an always-visible retry action for failed sends.

**Interaction philosophy:** users ask naturally, the coach answers practically, and every response can be checked against the saved profile/history context.

**Safety and privacy boundary:** chat is general fitness education, not medical care. The backend uses authenticated ownership for profile/history access, bounded message lengths, no provider secrets in the app, no cross-user lookup, and deletion-cascade-compatible records.
