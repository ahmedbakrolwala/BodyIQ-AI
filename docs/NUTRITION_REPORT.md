# BodyIQ AI — Nutrition System Report

## Delivered

The authenticated Nutrition tab now shows live user-owned nutrition data from the existing food-log and fitness-profile records. It groups today’s meals into breakfast, lunch, dinner and snacks, displays consumed calories and macro totals against saved targets, and never substitutes Design Preview numbers for a signed-in user.

Food search is backed by a server-owned catalog containing Indian and international dishes, vegetarian and non-vegetarian options, ingredient quantities, estimated calories/macros and approximate INR costs. Search supports query and cuisine filters. The server applies saved dietary restrictions and conservative allergy substring filtering before returning catalog results. Catalog values and costs are explicitly estimates, not label-verified nutrition or live prices.

Manual meal logging remains available. Catalog results can safely prefill the existing logging form. Authenticated meal cards support edit and explicit cross-platform delete confirmation through owner-scoped `tracking.updateMeal` and `tracking.deleteMeal` procedures. Dashboard and Nutrition totals refresh after writes; failed submissions preserve the editable draft and existing idempotent logging behavior remains intact.

## Meal plans and grocery lists

The new plan builder supports one-day, seven-day and thirty-day plans, Indian/international/mixed cuisine, low/standard/flexible budget tiers and profile/vegetarian/non-vegetarian modes. Plans require a saved fitness profile and use its goal, derived calorie/macronutrient targets, dietary preference and allergies. Profile restrictions take precedence over a looser requested mode.

Plans are generated deterministically from the curated catalog, with four meal slots per day. Selected portions, ingredient quantities and estimated nutrition/costs are scaled within bounded limits toward the user’s derived daily calorie target, while the plan remains approximate. Every saved plan stores a profile/target snapshot and meal snapshots, so previously generated plans remain reviewable even if the catalog changes. Grocery lines aggregate ingredient quantities by normalized ingredient and unit. The grocery screen is a separate authenticated route linked from a saved plan.

Nutrition planning is approximate. Budget amounts are not live market prices, and allergy filters are not safety guarantees; users must verify labels, preparation and cross-contact risk. No external food-price, grocery or medical API is required for this implementation.

## Persistence and security

Migration `0005_empty_shinobi_shaw.sql` adds `mealPlans`, `mealPlanMeals` and `mealPlanGroceries` with foreign keys, cascading ownership and indexes. Existing `foodLogs` remains the source of truth for the daily diary. All nutrition procedures are protected, derive ownership from the authenticated session and reject foreign plan/meal IDs. No user IDs are accepted from the client. No seed health or meal data was written during validation.

## Verification

The nutrition-specific suite passes five tests for catalog coverage, cuisine/search behavior, allergy filtering, dietary restriction precedence, supported plan durations and strict meal-edit/delete contracts. The full regression suite passes 99 tests across 19 files. TypeScript check, lint, backend build and Expo web/Android/iOS exports pass. Metro returns HTTP 200 for `/nutrition`, API health returns HTTP 200, and the route manifest includes `/meal-plan` and `/grocery-list`.

The public browser check confirmed the guest Nutrition route still shows the explicit Design Preview with sample-data labeling. A browser-only authenticated fixture confirmed the real Nutrition route renders a live-record badge, a 680 kcal fixture total, a real meal card and all four meal sections; mocked responses were used, no cloud writes were made, and the page was reloaded afterward to clear the fixture.

The next release-stage checks are real-device layout and native back-button testing for the long 30-day plan, live authenticated plan creation against a test account, and product decisions for catalog expansion, price freshness and a dedicated allergy/ingredient safety policy.
