import { describe, expect, it } from "vitest";
import { parseMeasurement } from "../lib/measurement-input";
import { fitnessInputSchema } from "../shared/fitness";
import { buildMealPlan } from "../shared/fitness-planning";
const base = fitnessInputSchema.parse({
  age: 30,
  heightCm: 175,
  weightKg: 75,
  targetWeightKg: null,
  experience: "beginner",
  primaryGoal: "general_fitness",
  activityLevel: "moderately_active",
  workoutLocation: "home",
  equipment: ["bodyweight"],
  dietaryPreference: "vegan",
  allergies: [],
  units: "metric",
  estimateEligible: true,
});
describe("onboarding regressions", () => {
  it("keeps optional blank targets null across unit conversion", () => {
    for (const value of ["", "  "]) {
      const n = parseMeasurement(value);
      expect(n).toBeNull();
      const converted = n === null ? null : n * 2.2046226218;
      expect(converted).toBeNull();
      expect(
        fitnessInputSchema.parse({ ...base, targetWeightKg: converted })
          .targetWeightKg,
      ).toBeNull();
    }
    expect(parseMeasurement("70,5")).toBe(70.5);
    expect(parseMeasurement("invalid")).toBeNull();
  });
  it("never reintroduces known protein allergens through dietary substitutions", () => {
    for (const [diet, allergen, token] of [
      ["pescatarian", "fish", "fish"],
      ["eggetarian", "eggs", "eggs"],
      ["vegan", "soy", "tofu"],
      ["vegetarian", "soy", "tofu"],
    ] as const) {
      const meals = buildMealPlan({
        ...base,
        dietaryPreference: diet,
        allergies: [allergen],
      });
      expect(meals.length).toBeGreaterThan(0);
      expect(
        meals
          .flatMap((m) => m.ingredients)
          .join(" ")
          .toLowerCase(),
      ).not.toContain(token);
    }
  });
  it("keeps vegan meals animal-free and suppresses unmapped custom allergies", () => {
    const meals = buildMealPlan(base)
      .flatMap((m) => m.ingredients)
      .join(" ")
      .toLowerCase();
    for (const food of ["chicken", "fish", "eggs", "greek yogurt"])
      expect(meals).not.toContain(food);
    expect(buildMealPlan({ ...base, allergies: ["lentils"] })).toEqual([]);
  });
});
