import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import * as trackingRepository from "../server/repositories/tracking";

vi.mock("../server/repositories/tracking", () => ({
  completeWorkout: vi.fn(),
  getTrackingSummary: vi.fn(),
  logMeal: vi.fn(),
  logWeight: vi.fn(),
  startWorkout: vi.fn(),
  MissingFitnessError: class MissingFitnessError extends Error {},
  TrackingConflictError: class TrackingConflictError extends Error {},
  TrackingNotFoundError: class TrackingNotFoundError extends Error {},
}));

const mockedGet = vi.mocked(trackingRepository.getTrackingSummary);
const mockedMeal = vi.mocked(trackingRepository.logMeal);
const mockedStart = vi.mocked(trackingRepository.startWorkout);
const mockedComplete = vi.mocked(trackingRepository.completeWorkout);
const mockedWeight = vi.mocked(trackingRepository.logWeight);

function context(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const user: NonNullable<TrpcContext["user"]> = {
  id: 42,
  openId: "tracking-test-user",
  email: "tracking@example.test",
  name: "Tracking User",
  loginMethod: "test",
  role: "user",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastSignedIn: new Date("2026-01-01T00:00:00.000Z"),
};

const mealInput = {
  clientId: "11111111-1111-4111-8111-111111111111",
  name: "Oats",
  mealType: "breakfast" as const,
  calories: 400,
  proteinG: 20,
  carbsG: 50,
  fatG: 12,
  timeZone: "Asia/Kolkata",
};

const workoutInput = {
  clientId: "22222222-2222-4222-8222-222222222222",
  timeZone: "America/New_York",
};

const weightInput = {
  clientId: "33333333-3333-4333-8333-333333333333",
  weightKg: 72.5,
  timeZone: "UTC",
};

describe("tracking router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue({} as never);
    mockedMeal.mockResolvedValue({} as never);
    mockedStart.mockResolvedValue({} as never);
    mockedComplete.mockResolvedValue({} as never);
    mockedWeight.mockResolvedValue({} as never);
  });

  it("requires authentication for every tracking operation", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(
      caller.tracking.get({ timeZone: "UTC" }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.tracking.logMeal(mealInput)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller.tracking.startWorkout(workoutInput),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller.tracking.completeWorkout({ id: 1 }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.tracking.logWeight(weightInput)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("rejects non-IANA zones and client-owned IDs on strict inputs", async () => {
    const caller = appRouter.createCaller(context(user));
    await expect(
      caller.tracking.get({ timeZone: "not/a-zone" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      caller.tracking.logMeal({ ...mealInput, userId: 999 } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.tracking.completeWorkout({ id: 0 }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mockedGet).not.toHaveBeenCalled();
    expect(mockedMeal).not.toHaveBeenCalled();
  });

  it("uses ctx.user.id and forwards the exact validated contracts", async () => {
    const caller = appRouter.createCaller(context(user));
    await caller.tracking.get({ timeZone: "Asia/Kolkata" });
    await caller.tracking.logMeal(mealInput);
    await caller.tracking.startWorkout(workoutInput);
    await caller.tracking.completeWorkout({ id: 19 });
    await caller.tracking.logWeight(weightInput);

    expect(mockedGet).toHaveBeenCalledWith(user.id, "Asia/Kolkata");
    expect(mockedMeal).toHaveBeenCalledWith(user.id, mealInput);
    expect(mockedStart).toHaveBeenCalledWith(user.id, workoutInput);
    expect(mockedComplete).toHaveBeenCalledWith(user.id, 19);
    expect(mockedWeight).toHaveBeenCalledWith(user.id, weightInput);
  });
});
