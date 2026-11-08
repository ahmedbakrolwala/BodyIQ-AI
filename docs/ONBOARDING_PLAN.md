# Fitness onboarding implementation

Extend the existing app with a five-step, authenticated mobile flow: measurements and units; experience/goal; activity and equipment; diet/allergies; review and save. Sensitive drafts remain in memory, with back/next navigation preserving values. Store canonical centimetres/kilograms in a separate one-to-one fitness-profile extension, linked to the existing user with cascading deletion. All ownership comes from the authenticated server context.

The shared strict schema and deterministic planning module are used by protected `fitness.get`/`fitness.save` APIs. The server recomputes estimated energy/macronutrient targets and curated dietary/equipment-aware guidance from saved data. Existing basic profile and auth APIs remain available. Reusable saved-profile cards personalize Home, Nutrition and Workouts; sample-preview metrics remain clearly separate from real profile recommendations.

Use the Mifflin–St Jeor resting-energy formula as an approximation. Because biological sex is not requested, show the female/male equation range and a clearly disclosed midpoint rather than inventing a sex value. Activity factors, goal adjustments and macro allocations are product assumptions, not medical prescriptions. Show clinical eligibility limits; users can save without opting into calorie estimates. Under-18 and pregnancy/breastfeeding/clinical-diet needs are outside calorie-target support. No aggressive target-date calculation is included.

`shared/fitness.ts` owns validation; `shared/fitness-planning.ts` owns estimates/recommendations; `server/repositories/fitness.ts` owns private persistence; `server/routers/fitness.ts` exposes protected APIs. `app/onboarding.tsx` and `app/fitness-profile.tsx` provide collection/display/editing, and `components/bodyiq/fitness-personalization.tsx` connects saved plans to existing screens.

Formula reference: https://reference.medscape.com/calculator/846/mifflin-st-jeor-equation-calculator

Adult eligibility reference: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner
