# BodyIQ AI Nutrition System Plan

## Implementation approach

Extend the existing TypeScript/React Native/Expo Router mobile app and Express/tRPC backend. Reuse the current owner-scoped `foodLogs` records for daily food logging, adding authenticated edit/delete mutations and a curated server-owned food catalog for search. Add additive managed-MySQL tables for saved meal plans and their meals/grocery lines. Generate plans deterministically from the saved fitness profile, derived calorie/macronutrient targets, dietary preference, allergies, cuisine and budget rather than inventing unsafe health facts. Every private query and mutation derives ownership from the authenticated session.

The nutrition screen will preserve Design Preview for guests and add a real authenticated experience: date/day totals, meal sections for breakfast/lunch/dinner/snacks, search and manual logging, edit/delete controls, plan-duration and budget/cuisine filters, saved-plan cards and grocery-list access. Existing scanner confirmation continues to write through the same tracking mutation, so totals refresh through the existing tracking refresh layer.

## Project structure

- `shared/nutrition.ts`: strict catalog, log-edit/delete, plan-generation, saved-plan and grocery contracts.
- `server/repositories/nutrition.ts`: owner-scoped catalog search, food-log CRUD, deterministic plan generation, saved-plan and grocery persistence.
- `server/routers/nutrition.ts`: protected tRPC procedures; no client-supplied user IDs.
- `drizzle/schema.ts` and an additive migration: saved meal-plan, plan-meal and grocery tables; existing food logs remain the diary source.
- `components/bodyiq/nutrition-real.tsx` and reusable nutrition controls: authenticated totals, meal sections, search, editor, plan builder and grocery list.
- `app/(tabs)/nutrition.tsx`: route-level preview/real-data split that preserves the current design preview.
- `app/meal-plan.tsx` and `app/grocery-list.tsx`: functional saved-plan and grocery destinations.

## Design decisions

**Design movement:** editorial performance nutrition with a premium dark athletic dashboard (probability 0.06). Alternative: clinical food ledger (0.08). Alternative: bright wellness journal (0.04).

**Core principles:** show real recorded values separately from estimates; make every plan input visible and editable; keep meals scannable by time of day; prefer safe empty states over fabricated personalization.

**Color philosophy:** black and charcoal provide calm focus for daily decisions; electric green marks confirmed actions and personal targets; muted lavender, orange and blue distinguish macros without turning the screen into a traffic light.

**Layout paradigm:** stacked timeline sections with horizontal summary rails, not a dense spreadsheet. Search and plan controls sit above the day’s meal timeline; saved plans open into a focused detail view.

**Signature elements:** green edge accents for user-owned records, compact macro rails, and ingredient/grocery chips with quantities.

**Interaction philosophy:** search first, then confirm. Users can edit every estimate before saving; destructive deletion requires an explicit confirmation.

**Animation:** use the existing reduced-motion-aware entrance transitions; animate totals and accordions subtly, never delaying a save or hiding loading/error states.

**Typography and voice:** preserve the existing bold condensed-feeling section hierarchy and concise action language: “Build a plan that fits your week.” and “Check the ingredients before you cook.”

**Brand essence:** an AI-ready nutrition operating system for people who want clear food decisions tied to their training goal. Personality: precise, motivating, grounded.

## Boundaries

Catalog nutrition and generated plan nutrition are estimates and are labeled as such. Allergies are used as exclusion filters, not safety guarantees; cross-contact and label checks remain the user’s responsibility. Budget is a planning preference and not a live price quote. No external food-price or medical API is required for Phase 1 of this nutrition system.
