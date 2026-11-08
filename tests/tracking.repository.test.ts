import { MySqlDialect } from "drizzle-orm/mysql-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fitnessProfiles,
  foodLogs,
  trainingLogs,
  userProfiles,
  weightLogs,
} from "../drizzle/schema";
import type { FitnessInput } from "../shared/fitness";
import {
  TrackingConflictError,
  getTrackingSummary,
  logMeal,
  logWeight,
  startWorkout,
} from "../server/repositories/tracking";
import { getDb } from "../server/db";

vi.mock("../server/db", () => ({ getDb: vi.fn() }));

const mockedGetDb = vi.mocked(getDb);
const dialect = new MySqlDialect();
const userId = 7;
const now = new Date("2026-11-08T12:00:00.000Z");

const profile: FitnessInput = {
  age: 30,
  heightCm: 175,
  weightKg: 80,
  targetWeightKg: 75,
  experience: "beginner",
  primaryGoal: "maintenance",
  activityLevel: "moderately_active",
  workoutLocation: "home",
  equipment: ["bodyweight"],
  dietaryPreference: "omnivore",
  allergies: [],
  units: "metric",
  estimateEligible: true,
};

const meal = (id: number, recordedAt: string, calories: number) => ({
  id,
  userId,
  clientId: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
  name: `Meal ${id}`,
  mealType: "lunch" as const,
  calories,
  proteinG: calories / 10,
  carbsG: calories / 5,
  fatG: calories / 20,
  recordedAt: new Date(recordedAt),
});

const workout = (
  id: number,
  startedAt: string,
  completedAt: string | null,
  activeUserId: number | null,
) => ({
  id,
  userId,
  clientId: `10000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
  name: `Workout ${id}`,
  exercisePlan: [],
  startedAt: new Date(startedAt),
  completedAt: completedAt ? new Date(completedAt) : null,
  activeUserId,
});

function queryBuilder(rows: unknown[], whereSql: string[]) {
  let selected = rows;
  const query: any = {
    where(condition: unknown) {
      const rendered = dialect.sqlToQuery(condition as any).sql;
      whereSql.push(rendered);
      return query;
    },
    orderBy() {
      return query;
    },
    limit() {
      return query;
    },
    for() {
      return query;
    },
    then(resolve: (value: unknown[]) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(selected).then(resolve, reject);
    },
  };
  Object.defineProperty(query, "setRows", {
    value: (nextRows: unknown[]) => {
      selected = nextRows;
      return query;
    },
  });
  return query;
}

function summaryDb() {
  const whereSql: string[] = [];
  const calls = new Map<unknown, number>();
  const dayMeals = [
    meal(1, "2026-11-08T05:00:00.000Z", 600),
    meal(2, "2026-11-08T10:00:00.000Z", 500),
  ];
  const todayWorkouts = [
    workout(1, "2026-11-07T20:00:00.000Z", null, userId),
    workout(2, "2026-11-08T07:00:00.000Z", "2026-11-08T08:00:00.000Z", null),
  ];
  const weekWorkouts = [
    ...todayWorkouts,
    workout(3, "2026-11-05T07:00:00.000Z", "2026-11-05T08:00:00.000Z", null),
    workout(4, "2026-11-05T09:00:00.000Z", "2026-11-05T10:00:00.000Z", null),
  ];
  const progressWorkouts = [
    ...weekWorkouts,
    workout(5, "2026-10-01T07:00:00.000Z", "2026-10-01T08:00:00.000Z", null),
  ];
  const weights = [
    { id: 1, userId, clientId: "w1", weightKg: 80, recordedAt: new Date("2026-11-08T09:00:00.000Z") },
    { id: 2, userId, clientId: "w2", weightKg: 81, recordedAt: new Date("2026-11-07T09:00:00.000Z") },
  ];
  const rowsFor = (table: unknown) => {
    const call = (calls.get(table) ?? 0) + 1;
    calls.set(table, call);
    if (table === foodLogs) return dayMeals;
    if (table === trainingLogs) {
      return call === 1 ? todayWorkouts : call === 2 ? weekWorkouts : progressWorkouts;
    }
    if (table === weightLogs) return weights;
    if (table === fitnessProfiles) return [{ profile }];
    if (table === userProfiles) return [{ units: "metric" }];
    return [];
  };
  const db: any = {
    select: vi.fn(() => ({
      from(table: unknown) {
        return queryBuilder(rowsFor(table), whereSql);
      },
    })),
  };
  return { db, whereSql };
}

function duplicateDb(existingRows: unknown[], txSelectRows: unknown[] = []) {
  const whereSql: string[] = [];
  const tx: any = {
    select: vi.fn(() => ({ from: () => queryBuilder(txSelectRows, whereSql) })),
    insert: vi.fn(() => ({ values: vi.fn(() => Promise.reject({ cause: { errno: 1062 } })) })),
    execute: vi.fn(() => Promise.resolve([])),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) })) })),
  };
  const db: any = {
    transaction: vi.fn(async (callback: (value: unknown) => unknown) => callback(tx)),
    select: vi.fn(() => ({ from: () => queryBuilder(existingRows, whereSql) })),
  };
  return { db, tx, whereSql };
}

beforeEach(() => vi.clearAllMocks());

describe("tracking repository", () => {
  it("computes fixture macros, clamps remaining/overshoot, prefers active, and counts distinct local week days", async () => {
    const { db, whereSql } = summaryDb();
    mockedGetDb.mockResolvedValue(db);
    const summary = await getTrackingSummary(userId, "Asia/Kolkata", now);

    expect(summary.consumed).toEqual({ calories: 1100, proteinG: 110, carbsG: 220, fatG: 55 });
    expect(summary.targets?.calories).toBeTypeOf("number");
    expect(summary.remainingCalories).toBe(Math.max(0, summary.targets!.calories! - 1100));
    expect(summary.overTargetCalories).toBe(Math.max(0, 1100 - summary.targets!.calories!));
    expect(summary.todayWorkout?.id).toBe(1);
    expect(summary.weekly).toMatchObject({ completedSessions: 3, completedDays: 2 });
    expect(summary.currentWeightKg).toBe(80);
    expect(summary.recentProgress[0]).toMatchObject({ id: "weight-1", type: "weight" });

    const workoutPredicate = whereSql.find((sql) => sql.includes("trainingLogs"));
    expect(workoutPredicate).toContain("activeUserId");
    expect(workoutPredicate).toContain("completedAt");
    expect(workoutPredicate).toContain("userId");
  });

  it("returns null targets and genuine zero remaining/overshoot when estimation is unavailable", async () => {
    const { db } = summaryDb();
    const unavailable = { ...profile, age: 17, estimateEligible: false };
    db.select.mockImplementation(() => ({
      from(table: unknown) {
        const rows = table === fitnessProfiles ? [{ profile: unavailable }] : [];
        return queryBuilder(rows, []);
      },
    }));
    mockedGetDb.mockResolvedValue(db);
    const summary = await getTrackingSummary(userId, "UTC", now);
    expect(summary.targets?.calories).toBeNull();
    expect(summary.remainingCalories).toBeNull();
    expect(summary.overTargetCalories).toBeNull();
  });

  it("recovers a duplicate meal insert and rejects a changed duplicate payload", async () => {
    const existing = meal(9, "2026-11-08T11:00:00.000Z", 400);
    const input = {
      clientId: existing.clientId,
      name: existing.name,
      mealType: existing.mealType,
      calories: existing.calories,
      proteinG: existing.proteinG,
      carbsG: existing.carbsG,
      fatG: existing.fatG,
      timeZone: "UTC",
    };
    const first = duplicateDb([existing]);
    mockedGetDb.mockResolvedValue(first.db);
    await expect(logMeal(userId, input)).resolves.toMatchObject({ id: 9, calories: 400 });

    const second = duplicateDb([existing]);
    mockedGetDb.mockResolvedValue(second.db);
    await expect(logMeal(userId, { ...input, calories: 401 })).rejects.toBeInstanceOf(TrackingConflictError);
  });

  it("recovers an active-workout unique-key race and does not overwrite on weight retry", async () => {
    const active = workout(21, "2026-11-08T09:00:00.000Z", null, userId);
    const start = duplicateDb([]);
    start.tx.select
      .mockImplementationOnce(() => ({ from: () => queryBuilder([], []) }))
      .mockImplementationOnce(() => ({ from: () => queryBuilder([], []) }))
      .mockImplementationOnce(() => ({ from: () => queryBuilder([{ profile }], []) }));
    start.db.select
      .mockImplementationOnce(() => ({ from: () => queryBuilder([], []) }))
      .mockImplementationOnce(() => ({ from: () => queryBuilder([active], []) }));
    mockedGetDb.mockResolvedValue(start.db);
    await expect(startWorkout(userId, { clientId: "20000000-0000-4000-8000-000000000001", timeZone: "UTC" })).resolves.toMatchObject({ id: 21 });

    const existingWeight = { id: 31, userId, clientId: "30000000-0000-4000-8000-000000000001", weightKg: 72, recordedAt: new Date("2026-11-08T11:00:00.000Z") };
    const retry = duplicateDb([existingWeight], [existingWeight]);
    mockedGetDb.mockResolvedValue(retry.db);
    await expect(logWeight(userId, { clientId: existingWeight.clientId, weightKg: 72, timeZone: "UTC" })).resolves.toMatchObject({ weightKg: 72 });
    expect(retry.tx.update).not.toHaveBeenCalled();
  });
});
