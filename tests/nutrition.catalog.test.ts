import { describe, expect, it } from "vitest";
import {
  createMealPlanInputSchema,
  deleteMealInputSchema,
  searchFoodsInputSchema,
  updateMealInputSchema,
} from "../shared/nutrition";
import { FOOD_CATALOG } from "../server/services/nutrition-catalog";
import { searchCatalog } from "../server/repositories/nutrition";

describe("nutrition catalog", () => {
  it("contains Indian and international vegetarian and non-vegetarian choices", () => {
    expect(FOOD_CATALOG.some((food) => food.cuisine === "indian")).toBe(true);
    expect(FOOD_CATALOG.some((food) => food.cuisine === "international")).toBe(
      true,
    );
    expect(
      FOOD_CATALOG.some((food) => food.dietTags.includes("vegetarian")),
    ).toBe(true);
    expect(
      FOOD_CATALOG.some((food) => food.dietTags.includes("non_vegetarian")),
    ).toBe(true);
  });

  it("searches by dish or ingredient and applies cuisine and allergy filters", () => {
    const dosa = searchCatalog(
      { query: "paneer", cuisine: "indian", limit: 25 },
      [],
      "omnivore",
    );
    expect(dosa.map((food) => food.id)).toContain("ind-paneer-bowl");

    const international = searchCatalog(
      { query: "", cuisine: "international", limit: 25 },
      [],
      "omnivore",
    );
    expect(
      international.every((food) => food.cuisine === "international"),
    ).toBe(true);

    const peanutFree = searchCatalog(
      { query: "", cuisine: "mixed", limit: 50 },
      ["peanut"],
      "omnivore",
    );
    expect(peanutFree.some((food) => food.id === "ind-veg-poha")).toBe(false);
  });

  it("keeps restricted profiles vegetarian in search results", () => {
    const results = searchCatalog(
      { query: "", cuisine: "mixed", limit: 50 },
      [],
      "vegetarian",
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((food) => food.dietTags.includes("vegetarian"))).toBe(
      true,
    );
  });
});

describe("nutrition contracts", () => {
  it("accepts only supported plan durations and strict options", () => {
    expect(
      createMealPlanInputSchema.parse({
        durationDays: 1,
        cuisine: "indian",
        budget: "low",
        dietaryMode: "profile",
      }).durationDays,
    ).toBe(1);
    expect(() =>
      createMealPlanInputSchema.parse({
        durationDays: 14,
        cuisine: "indian",
        budget: "low",
        dietaryMode: "profile",
      }),
    ).toThrow();
  });

  it("requires an edited field and keeps meal deletion owner-neutral", () => {
    expect(() => updateMealInputSchema.parse({ id: 4 })).toThrow();
    expect(updateMealInputSchema.parse({ id: 4, calories: 450 })).toEqual({
      id: 4,
      calories: 450,
    });
    expect(deleteMealInputSchema.parse({ id: 4 })).toEqual({ id: 4 });
    expect(() =>
      searchFoodsInputSchema.parse({ query: "rice", extra: true }),
    ).toThrow();
  });
});
