# BodyIQ AI fitness onboarding

The existing app now has a five-step mobile onboarding system and an editable fitness-profile screen. Start from the new fitness-profile card on Home, Nutrition, Workouts or Profile. Sign in first; no guest health records are created. Existing authentication, navigation, cloud account editing and explicitly labeled design previews remain available.

## Collection and persistence

The flow collects age, height, current weight, optional target weight, experience, primary goal, activity level, gym/home preference, equipment, dietary preference, allergies and preferred units. It supports muscle gain, fat loss, maintenance, strength and general fitness. Numbers use suitable mobile keyboards; back/next retains the in-memory draft. Metric and imperial inputs are converted to canonical centimetres/kilograms. A blank target stays null, including during unit switching and editing. Unsaved drafts are not stored in device plaintext.

An additive migration creates `fitnessProfiles`, linked one-to-one to the authenticated user with cascading deletion. Strict protected `fitness.get`/`fitness.save` procedures never trust a client-supplied owner ID. Measurement preferences stay synchronized with the existing account-profile editor. Initial onboarding detects an existing saved profile and offers view/edit instead of silently replacing it. Save invalidates profile queries and opens the saved fitness overview, where all answers and estimated targets can be reviewed and edited.

## Estimates and personalization

The backend derives approximate daily calorie and protein/carbohydrate/fat targets from saved measurements, age, activity and goal. Mifflin–St Jeor equations provide a resting-energy range; because biological sex is not collected, the app discloses an unknown-sex midpoint rather than assigning a sex [1]. Activity factors, modest goal adjustments, calorie bounds and macro allocation are product assumptions. Targets are rounded educational starting points, not clinical prescriptions or promised outcomes.

Users explicitly choose whether they qualify for estimates. Under-18 profiles and users who do not acknowledge adult/non-pregnant/non-breastfeeding/non-clinical-diet eligibility receive no calorie/macronutrient targets [2]. Low current/target BMI prevents fat-loss cuts. No target-date or aggressive rapid-loss calculation is provided.

Saved-profile cards personalize Home, Nutrition and Workouts independently of sample-preview metrics. Meal-plan ideas use dietary preferences and final-ingredient allergen checks; protein substitutions cannot reintroduce a recorded common allergen. Unmapped custom allergies suppress meal ideas rather than claiming safety. Ingredient labels and cross-contact risks must still be checked. Portions are guidance, not a precisely calorie-balanced or automatically logged meal plan.

Workout guidance adapts exercises and weekly frequency to goal, experience, location and equipment. It uses bodyweight when equipment is absent and does not invent gym equipment merely because gym was selected. These are starter recommendations, not live AI-generated clinical or rehabilitation programs.

## Verification

77 automated tests across 13 suites pass, alongside TypeScript, lint and backend compilation. Final web, Android and iOS JavaScript exports pass. The real cloud table and both API/Metro listeners were verified. Mobile guest-entry/profile layouts were checked. A temporary browser-only fixture exercised all five wizard steps, a blank optional target, intercepted save, saved-profile display and edit preloading without creating a live account or writing health data to the cloud. The fixture was cleared afterward. Numeric parsing, eligibility, ownership, unit conversion, diet substitutions and equipment filtering have isolated regression coverage.

Review findings were corrected: optional blank values had become zero; allergy filtering previously ran before substitutions; old privacy copy did not describe the newly saved measurements. The migration also removed a redundant unique declaration before applying cleanly. NativeWind's supported filesystem mode avoids the installed Metro virtual-file watcher incompatibility; a fresh Preview reload may be needed after a watcher restart.

No signed native release or physical-phone profile round trip is claimed. Live Google/email activation still awaits the provider credentials noted in the authentication handoff; existing Manus access remains available. Onboarding itself needs no new external API keys.

## Source

The complete updated source remains in the existing Manus project, with shared schemas/planning logic, protected repositories/routes, UI components, migrations and tests. The downloadable archive excludes credentials, dependencies, generated builds and signing material.

## References

[1]: https://reference.medscape.com/calculator/846/mifflin-st-jeor-equation-calculator "Mifflin–St Jeor equation clinical reference"
[2]: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner "NIDDK Body Weight Planner adult eligibility"
