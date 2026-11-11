import { describe, expect, it } from "vitest";
import { filterCatalog } from "../server/services/workout-catalog";
import {
  deriveEstimatedRecord,
  generateWorkoutPlanInputSchema,
  startWorkoutSessionInputSchema,
} from "../shared/workouts";

describe("workout backend contracts", () => {
  it("filters catalog by location, goal, equipment, and individual muscle group", () => {
    const result = filterCatalog({
      goal: "strength",
      location: "home",
      split: "individual_muscle_group",
      muscleGroup: "back",
      equipment: ["pullup_bar"],
    });
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((exercise) => exercise.locations.includes("home")),
    ).toBe(true);
    expect(
      result.every((exercise) => exercise.goalTags.includes("strength")),
    ).toBe(true);
    expect(
      result.every((exercise) => exercise.muscleGroups.includes("back")),
    ).toBe(true);
    expect(
      result.every((exercise) => exercise.equipment.includes("pullup_bar")),
    ).toBe(true);
  });

  it("rejects client ownership fields and invalid split selections", () => {
    expect(() =>
      generateWorkoutPlanInputSchema.parse({
        goal: "strength",
        location: "gym",
        split: "full_body",
        equipment: [],
        userId: 9,
      }),
    ).toThrow();
    expect(() =>
      generateWorkoutPlanInputSchema.parse({
        goal: "strength",
        location: "gym",
        split: "individual_muscle_group",
        muscleGroup: null,
        equipment: [],
      }),
    ).toThrow();
    expect(() =>
      startWorkoutSessionInputSchema.parse({
        planId: 1,
        clientId: "00000000-0000-4000-8000-000000000001",
        userId: 9,
      }),
    ).toThrow();
  });

  it("derives transparent estimated records from completed logged sets", () => {
    expect(deriveEstimatedRecord(100, 1)).toBe(103.3);
    expect(deriveEstimatedRecord(100, 5)).toBe(116.7);
    expect(deriveEstimatedRecord(0, 10)).toBe(0);
  });
});
