# BodyIQ fitness estimation contract

This backend stores the user-entered `FitnessInput` JSON and derives targets and plans on every read/save. It does not store sex, medical conditions, deadlines, secrets, or generated plans. The UI is responsible for acknowledging that the user is not pregnant or breastfeeding and does not need a medical diet before enabling estimates.

## Eligibility and safety boundaries

Inputs are adults-only for estimation (`age >= 18`) and must explicitly set `estimateEligible: true`. The shared contract still accepts ages 13–100 so a profile can be saved without an estimate. For an ineligible profile or a person under 18, all numeric targets are `null` and the response includes a plain-language note.

Height is constrained to 100–250 cm and weight to 25–350 kg. Estimates are conservative planning guidance, not a diagnosis or a promise of weight change. Calories are clamped to 1,500–4,500 kcal when an outlier calculation falls outside that range, and the response says when clamping occurred.

A fat-loss cut is not applied when current BMI or the requested target BMI is below 18.5. In that case, the backend returns maintenance guidance instead. No deadline or extreme-goal input is collected or inferred.

## Formula and assumptions

The estimator uses the Mifflin–St Jeor resting-energy equation:

```text
BMR = 10 × weightKg + 6.25 × heightCm − 5 × age + sex offset
```

Because sex is intentionally not collected, it calculates a range using offsets `−161` and `+5`, then uses their midpoint (`−78`) for one planning value. That estimate is multiplied by the selected activity factor:

| Activity          | Factor |
| ----------------- | -----: |
| sedentary         |    1.2 |
| lightly_active    |  1.375 |
| moderately_active |   1.55 |
| very_active       |  1.725 |

`very_active` is a conservative BodyIQ product assumption labeled “daily active training”; it is not presented as a universal clinical activity factor.

Goal adjustments are deliberately modest: `+200 kcal` for muscle gain, `−min(250 kcal, 15%)` for fat loss when a cut is allowed, and maintenance for strength, maintenance, and general fitness. Protein is `1.6 g/kg`; fat is `30%` of calories; carbohydrate is the remaining energy. Display values are rounded and labeled as approximate guidance rather than a perfect macro prescription.

The planner is deterministic and runs on the server. It does not call an LLM or require an API key.

## Plans and allergy handling

Meal templates are curated three-meal guidance with optional portion quantities explicitly labeled as guidance. Each template has internal allergen metadata. Common labels are `dairy`, `eggs`, `fish`, `shellfish`, `peanuts`, `tree_nuts`, `wheat`, `soy`, and `sesame`; values are trimmed and lowercased, with a maximum of 20 labels and 40 characters each. An unrecognized custom allergy suppresses the entire meal plan rather than making an unsafe allergy-free claim. Recognized allergens filter individual templates.

Workout plans use the requested location, experience, goal, and equipment. If no equipment is selected, exercises are bodyweight-only. Barbell exercises are never suggested unless `barbell` is selected; optional bench-dependent moves fall back to a floor press when no bench is selected.

## Sources

- Mifflin et al., _A new predictive equation for resting energy expenditure in healthy individuals_, PubMed PMID 2305711: <https://pubmed.ncbi.nlm.nih.gov/2305711/>
- National Institute of Diabetes and Digestive and Kidney Diseases, _Body Weight Planner_: <https://www.niddk.nih.gov/bwp>

These references support adult, non-pregnant/non-breastfeeding energy-planning context. They do not replace individualized medical or registered-dietitian advice.

Accessible formula reference verified during implementation: https://reference.medscape.com/calculator/846/mifflin-st-jeor-equation-calculator
