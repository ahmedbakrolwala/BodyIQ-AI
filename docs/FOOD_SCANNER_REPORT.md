# BodyIQ AI — AI Food Scanner Report

## Delivered

The authenticated Food Scanner now supports taking a photo or choosing one from the gallery through Expo ImagePicker. The flow has explicit permission, cancellation, unsupported-format, unavailable-service and loading states. Guests remain blocked by the existing `AuthGate`, and manual meal logging remains available.

After a photo is selected, the app sends bounded base64 image input to the protected `foodScanner.analyze` procedure. The server validates the authenticated user, allowed MIME type (`image/jpeg`, `image/png` or `image/webp`) and 5 MiB raw-byte limit. It uploads the bytes under a random user-scoped object-storage key, obtains a signed fetch URL and sends that URL to the existing Manus built-in LLM runtime. No AI credential or storage credential is included in the mobile bundle.

The server requests a strict structured result and validates it again with the shared Zod contract. A clear result contains likely foods, likely ingredients, an estimated serving size, estimated calories/macros, confidence and a note. An unclear result must contain no items and no nutrition. The prompt explicitly covers Indian and international foods, blurry/non-food images, responsible uncertainty and the fact that nutrition is approximate rather than medical or exact.

The review screen labels the result as an estimate and allows edits to food name, serving size, meal type, calories, protein, carbohydrates and fat. Confirmation reuses the existing owner-scoped, idempotent `tracking.logMeal` mutation with a generated client ID, then refreshes tracking so Home totals update. Failed confirmation preserves the draft and client ID for retry. The saved record includes the corrected food name and serving size together within the existing meal-name field because the current tracking schema has no separate serving-size column.

## Services and configuration

The only required runtime services are Manus-managed object storage and the existing Manus built-in LLM/Forge runtime already used by this project. No separate OpenAI, Google Vision or nutrition-provider API key is configured or needed for the current implementation. `FOOD_SCANNER_MODEL` is an optional server-only model ID. When supplied, the backend verifies it against the live managed model catalog before use; an unknown value is ignored in favor of the built-in default route. The selected/default model must support image input.

The image is uploaded to managed object storage because the multimodal model needs an externally fetchable signed URL. The current runtime storage contract has no application-facing delete operation, so scan objects are placed under a random user-scoped key and are not linked to a food-log record or exposed in the app’s browsing UI. A future retention/deletion policy should be added before production launch if scan-photo deletion is a product requirement.

Native permission text is configured in `app.config.ts`. The Expo ImagePicker dependency is pinned in `package.json` and `pnpm-lock.yaml`. Provider credentials remain server-side and are not added to `.env.example`; only the optional model selector is documented there.

## Verification

The focused scanner tests pass for secure upload and signed URL handoff, clear structured output, deliberate unclear output, invalid/empty/oversized/unsupported input, invalid model output and unauthenticated router access. The full regression suite passes: 94 tests across 18 files.

`pnpm check`, targeted scanner lint, `pnpm build` and Expo exports for web, Android and iOS passed. Metro returned HTTP 200 on `/scanner`, the API health endpoint returned HTTP 200, and a direct unauthenticated scanner request returned HTTP 401.

A browser-only fixture test opened the real gallery file input, injected a tiny JPEG without uploading it to project storage, returned a mocked clear vision result, rendered likely ingredients, edited the estimate, confirmed the meal through the mocked tracking mutation and verified the refreshed fixture totals changed from 0 to 390 kcal consumed and 1,710 kcal remaining. The page was reloaded afterward to clear the fixture. No live user, meal, scan or health record was created.

The remaining release-stage checks are real camera permission behavior on Android/iOS, a real vision-model request with a configured provider/runtime, storage retention policy review, device builds and signed Android/iOS release artifacts.
