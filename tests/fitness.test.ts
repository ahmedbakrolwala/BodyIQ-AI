import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import * as fitnessRepository from "../server/repositories/fitness";
import {
  fitnessInputSchema,
  type FitnessInput,
  inchesToCentimeters,
  poundsToKilograms,
} from "../shared/fitness";
import {
  buildMealPlan,
  buildWorkoutPlan,
  deriveFitnessPlan,
  estimateFitnessTargets,
} from "../shared/fitness-planning";

vi.mock("../server/repositories/fitness", () => ({
  getFitnessPlanByUserId: vi.fn(),
  upsertFitnessProfile: vi.fn(),
}));

const mockedGet = vi.mocked(fitnessRepository.getFitnessPlanByUserId);
const mockedSave = vi.mocked(fitnessRepository.upsertFitnessProfile);

const validInput: FitnessInput = {
  age: 30,
  heightCm: 175,
  weightKg: 75,
  targetWeightKg: 70,
  experience: "beginner",
  primaryGoal: "fat_loss",
  activityLevel: "moderately_active",
  workoutLocation: "home",
  equipment: [],
  dietaryPreference: "omnivore",
  allergies: [],
  units: "metric",
  estimateEligible: true,
};

function createContext(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const user: NonNullable<TrpcContext["user"]> = {
  id: 42,
  openId: "fitness-test-user",
  email: "fitness@example.com",
  name: "Fitness Test",
  loginMethod: "test",
  role: "user",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastSignedIn: new Date("2026-01-01T00:00:00.000Z"),
};

describe("fitness contract and planner", () => {
  it("normalizes allergy values and rejects unknown fields", () => {
    const parsed = fitnessInputSchema.parse({
      ...validInput,
      allergies: ["  Dairy  ", "dairy"],
    });
    expect(parsed.allergies).toEqual(["dairy"]);
    expect(() =>
      fitnessInputSchema.parse({ ...validInput, userId: 9 }),
    ).toThrow();
  });

  it("uses deterministic midpoint math and exposes the maintenance range", () => {
    const first = estimateFitnessTargets(validInput);
    const second = estimateFitnessTargets(validInput);
    expect(first).toEqual(second);
    expect(first.calories).toBeTypeOf("number");
    expect(first.maintenanceLow).toBeLessThan(first.maintenanceHigh!);
    expect(first.note).toContain("unknown-sex midpoint");
  });

  it("does not estimate ineligible or under-18 profiles", () => {
    expect(
      estimateFitnessTargets({ ...validInput, age: 17 }).calories,
    ).toBeNull();
    expect(
      estimateFitnessTargets({ ...validInput, estimateEligible: false })
        .proteinG,
    ).toBeNull();
    const underweight = estimateFitnessTargets({
      ...validInput,
      weightKg: 50,
      targetWeightKg: 50,
      primaryGoal: "fat_loss",
    });
    expect(underweight.calories).toBeGreaterThanOrEqual(
      underweight.maintenanceLow!,
    );
    expect(underweight.note).toContain("below 18.5");
  });

  it("suppresses meals for unknown allergies and never invents equipment", () => {
    expect(buildMealPlan({ ...validInput, allergies: ["propolis"] })).toEqual(
      [],
    );
    const bodyweightPlan = buildWorkoutPlan(validInput);
    expect(
      bodyweightPlan.exercises.some((exercise) =>
        exercise.name.includes("Barbell"),
      ),
    ).toBe(false);
    expect(
      bodyweightPlan.exercises.some((exercise) =>
        exercise.name.includes("Bodyweight"),
      ),
    ).toBe(true);
    const barbellPlan = buildWorkoutPlan({
      ...validInput,
      equipment: ["barbell"],
    });
    expect(
      barbellPlan.exercises.some((exercise) =>
        exercise.name.includes("Barbell"),
      ),
    ).toBe(true);
  });

  it("has deterministic unit helpers and returns the shared response shape", () => {
    expect(inchesToCentimeters(1)).toBeCloseTo(2.54);
    expect(poundsToKilograms(2.2046226218)).toBeCloseTo(1);
    const plan = deriveFitnessPlan(validInput);
    expect(plan).toMatchObject({
      profile: validInput,
      targets: expect.any(Object),
      mealPlan: expect.any(Array),
      workoutPlan: expect.any(Object),
    });
  });
});

describe("fitness router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue(null);
    mockedSave.mockResolvedValue(deriveFitnessPlan(validInput));
  });

  it("requires authentication and an empty strict get input", async () => {
    const unauthenticated = appRouter.createCaller(createContext(null));
    await expect(unauthenticated.fitness.get()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    const caller = appRouter.createCaller(createContext(user));
    await expect(
      caller.fitness.get({ userId: 999 } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("uses only ctx.user.id for get and save", async () => {
    const caller = appRouter.createCaller(createContext(user));
    await caller.fitness.get();
    await caller.fitness.save(validInput);
    expect(mockedGet).toHaveBeenCalledWith(user.id);
    expect(mockedSave).toHaveBeenCalledWith(user.id, validInput);
    await expect(
      caller.fitness.save({ ...validInput, userId: 123 } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});
