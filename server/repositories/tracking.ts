import { and, desc, eq, gte, isNull, lt, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  fitnessProfiles,
  foodLogs,
  trainingLogs,
  userProfiles,
  users,
  weightLogs,
} from "../../drizzle/schema";
import type { FitnessExercise, FitnessPlan } from "../../shared/fitness";
import { fitnessInputSchema } from "../../shared/fitness";
import { deriveFitnessPlan } from "../../shared/fitness-planning";
import {
  localDateKey,
  localDayLabel,
  localDayPeriod,
  mondayWeekPeriod,
} from "../../shared/tracking-dates";
import type {
  LogMealInput,
  LogWeightInput,
  MealRecord,
  StartWorkoutInput,
  TrackingSummary,
  WeightRecord,
  WorkoutRecord,
} from "../../shared/tracking";
import { getDb } from "../db";

export class TrackingConflictError extends Error {
  readonly code = "CONFLICT" as const;

  constructor(message = "The clientId was already used with different data") {
    super(message);
    this.name = "TrackingConflictError";
  }
}

export class TrackingNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;

  constructor(message = "Tracking record not found") {
    super(message);
    this.name = "TrackingNotFoundError";
  }
}

export class MissingFitnessError extends Error {
  readonly code = "BAD_REQUEST" as const;

  constructor() {
    super("Save a fitness profile before starting a workout");
    this.name = "MissingFitnessError";
  }
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured or reachable");
  return db;
}

function iso(date: Date): string {
  return new Date(date).toISOString();
}

function mealRecord(row: typeof foodLogs.$inferSelect): MealRecord {
  return {
    id: row.id,
    name: row.name,
    mealType: row.mealType,
    calories: Number(row.calories),
    proteinG: Number(row.proteinG),
    carbsG: Number(row.carbsG),
    fatG: Number(row.fatG),
    recordedAt: iso(row.recordedAt),
  };
}

function exercisesFromSnapshot(value: unknown): FitnessExercise[] {
  if (!Array.isArray(value)) return [];
  return value as FitnessExercise[];
}

function workoutRecord(row: typeof trainingLogs.$inferSelect): WorkoutRecord {
  return {
    id: row.id,
    name: row.name,
    startedAt: iso(row.startedAt),
    completedAt: row.completedAt ? iso(row.completedAt) : null,
    exercises: exercisesFromSnapshot(row.exercisePlan),
  };
}

function sameMeal(
  row: typeof foodLogs.$inferSelect,
  input: LogMealInput,
): boolean {
  return (
    row.name === input.name &&
    row.mealType === input.mealType &&
    Number(row.calories) === input.calories &&
    Number(row.proteinG) === input.proteinG &&
    Number(row.carbsG) === input.carbsG &&
    Number(row.fatG) === input.fatG
  );
}

function sameWeight(
  row: typeof weightLogs.$inferSelect,
  input: LogWeightInput,
): boolean {
  return Number(row.weightKg) === input.weightKg;
}

function isDuplicateKeyError(
  error: unknown,
  seen = new Set<object>(),
): boolean {
  if (!error || typeof error !== "object") return false;
  if (seen.has(error)) return false;
  seen.add(error);

  const candidate = error as {
    code?: unknown;
    errno?: unknown;
    cause?: unknown;
    originalError?: unknown;
  };
  if (
    candidate.code === "ER_DUP_ENTRY" ||
    candidate.code === 1062 ||
    candidate.errno === 1062
  ) {
    return true;
  }
  return (
    isDuplicateKeyError(candidate.cause, seen) ||
    isDuplicateKeyError(candidate.originalError, seen)
  );
}

async function getFitnessState(
  userId: number,
): Promise<{ plan: FitnessPlan; units: "metric" | "imperial" } | null> {
  const db = await requireDb();
  const rows = await db
    .select({ profile: fitnessProfiles.profile })
    .from(fitnessProfiles)
    .where(eq(fitnessProfiles.userId, userId))
    .limit(1);
  if (!rows[0]) return null;
  const profile = fitnessInputSchema.parse(rows[0].profile);
  return { plan: deriveFitnessPlan(profile), units: profile.units };
}

export async function logMeal(
  userId: number,
  input: LogMealInput,
  now = new Date(),
): Promise<MealRecord> {
  const db = await requireDb();
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(foodLogs)
        .where(
          and(eq(foodLogs.userId, userId), eq(foodLogs.clientId, input.clientId)),
        )
        .limit(1);
      if (existing[0]) {
        if (!sameMeal(existing[0], input)) throw new TrackingConflictError();
        return mealRecord(existing[0]);
      }

      await tx.insert(foodLogs).values({
        userId,
        clientId: input.clientId,
        name: input.name,
        mealType: input.mealType,
        calories: input.calories,
        proteinG: input.proteinG,
        carbsG: input.carbsG,
        fatG: input.fatG,
        recordedAt: now,
      });
      const inserted = await tx
        .select()
        .from(foodLogs)
        .where(
          and(eq(foodLogs.userId, userId), eq(foodLogs.clientId, input.clientId)),
        )
        .limit(1);
      if (!inserted[0])
        throw new Error("Meal insert completed but could not be read");
      return mealRecord(inserted[0]);
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const existing = await db
      .select()
      .from(foodLogs)
      .where(
        and(eq(foodLogs.userId, userId), eq(foodLogs.clientId, input.clientId)),
      )
      .limit(1);
    if (!existing[0]) throw error;
    if (!sameMeal(existing[0], input)) throw new TrackingConflictError();
    return mealRecord(existing[0]);
  }
}

export async function startWorkout(
  userId: number,
  input: StartWorkoutInput,
  now = new Date(),
): Promise<WorkoutRecord> {
  const db = await requireDb();
  try {
    return await db.transaction(async (tx) => {
      const existingClient = await tx
        .select()
        .from(trainingLogs)
        .where(
          and(
            eq(trainingLogs.userId, userId),
            eq(trainingLogs.clientId, input.clientId),
          ),
        )
        .limit(1);
      if (existingClient[0]) return workoutRecord(existingClient[0]);

      const active = await tx
        .select()
        .from(trainingLogs)
        .where(
          and(
            eq(trainingLogs.userId, userId),
            eq(trainingLogs.activeUserId, userId),
            isNull(trainingLogs.completedAt),
          ),
        )
        .orderBy(desc(trainingLogs.startedAt))
        .limit(1);
      if (active[0]) return workoutRecord(active[0]);

      const fitnessRows = await tx
        .select({ profile: fitnessProfiles.profile })
        .from(fitnessProfiles)
        .where(eq(fitnessProfiles.userId, userId))
        .limit(1);
      if (!fitnessRows[0]) throw new MissingFitnessError();
      const profile = fitnessInputSchema.parse(fitnessRows[0].profile);
      const plan = deriveFitnessPlan(profile);

      await tx.insert(trainingLogs).values({
        userId,
        clientId: input.clientId,
        name: plan.workoutPlan.title,
        exercisePlan: plan.workoutPlan.exercises,
        startedAt: now,
        completedAt: null,
        activeUserId: userId,
      });
      const inserted = await tx
        .select()
        .from(trainingLogs)
        .where(
          and(
            eq(trainingLogs.userId, userId),
            eq(trainingLogs.clientId, input.clientId),
          ),
        )
        .limit(1);
      if (!inserted[0])
        throw new Error("Workout insert completed but could not be read");
      return workoutRecord(inserted[0]);
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    const existingClient = await db
      .select()
      .from(trainingLogs)
      .where(
        and(
          eq(trainingLogs.userId, userId),
          eq(trainingLogs.clientId, input.clientId),
        ),
      )
      .limit(1);
    if (existingClient[0]) return workoutRecord(existingClient[0]);

    const active = await db
      .select()
      .from(trainingLogs)
      .where(
        and(
          eq(trainingLogs.userId, userId),
          eq(trainingLogs.activeUserId, userId),
          isNull(trainingLogs.completedAt),
        ),
      )
      .orderBy(desc(trainingLogs.startedAt))
      .limit(1);
    if (active[0]) return workoutRecord(active[0]);
    throw error;
  }
}

export async function completeWorkout(
  userId: number,
  id: number,
  now = new Date(),
): Promise<WorkoutRecord> {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const owned = await tx
      .select()
      .from(trainingLogs)
      .where(and(eq(trainingLogs.id, id), eq(trainingLogs.userId, userId)))
      .for("update")
      .limit(1);
    if (!owned[0]) throw new TrackingNotFoundError("Workout not found");
    if (owned[0].completedAt) return workoutRecord(owned[0]);

    await tx
      .update(trainingLogs)
      .set({ completedAt: now, activeUserId: null })
      .where(
        and(
          eq(trainingLogs.id, id),
          eq(trainingLogs.userId, userId),
          isNull(trainingLogs.completedAt),
        ),
      );
    const completed = await tx
      .select()
      .from(trainingLogs)
      .where(and(eq(trainingLogs.id, id), eq(trainingLogs.userId, userId)))
      .limit(1);
    if (!completed[0]) throw new Error("Workout completion could not be read");
    return workoutRecord(completed[0]);
  });
}

export async function logWeight(
  userId: number,
  input: LogWeightInput,
  now = new Date(),
): Promise<WeightRecord> {
  const db = await requireDb();
  try {
    return await db.transaction(async (tx) => {
      // Serialize with full fitness-profile saves on the required owner row.
      await tx.execute(
        sql`SELECT id FROM ${users} WHERE id = ${userId} FOR UPDATE`,
      );
      const existing = await tx
        .select()
        .from(weightLogs)
        .where(
          and(
            eq(weightLogs.userId, userId),
            eq(weightLogs.clientId, input.clientId),
          ),
        )
        .limit(1);
      if (existing[0]) {
        if (!sameWeight(existing[0], input)) throw new TrackingConflictError();
        return {
          weightKg: Number(existing[0].weightKg),
          recordedAt: iso(existing[0].recordedAt),
        };
      }

      await tx.insert(weightLogs).values({
        userId,
        clientId: input.clientId,
        weightKg: input.weightKg,
        recordedAt: now,
      });

      // The owner-row lock above serializes this with full profile saves. The
      // JSON_SET changes only weightKg, preserving units, goals, diet, and every
      // other saved fitness field.
      await tx
        .update(fitnessProfiles)
        .set({
          profile: sql`JSON_SET(${fitnessProfiles.profile}, '$.weightKg', ${input.weightKg})`,
          updatedAt: now,
        })
        .where(eq(fitnessProfiles.userId, userId));

      return { weightKg: input.weightKg, recordedAt: iso(now) };
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const existing = await db
      .select()
      .from(weightLogs)
      .where(
        and(
          eq(weightLogs.userId, userId),
          eq(weightLogs.clientId, input.clientId),
        ),
      )
      .limit(1);
    if (!existing[0]) throw error;
    if (!sameWeight(existing[0], input)) throw new TrackingConflictError();
    return {
      weightKg: Number(existing[0].weightKg),
      recordedAt: iso(existing[0].recordedAt),
    };
  }
}

export async function getTrackingSummary(
  userId: number,
  timeZone: string,
  now = new Date(),
): Promise<TrackingSummary> {
  const db = await requireDb();
  const day = localDayPeriod(now, timeZone);
  const week = mondayWeekPeriod(now, timeZone);
  const [
    mealRows,
    workoutRows,
    weekWorkoutRows,
    progressWeights,
    progressWorkouts,
    fitnessState,
    profileRows,
  ] = await Promise.all([
    db
      .select()
      .from(foodLogs)
      .where(
        and(
          eq(foodLogs.userId, userId),
          gte(foodLogs.recordedAt, day.start),
          lt(foodLogs.recordedAt, day.end),
        ),
      )
      .orderBy(foodLogs.recordedAt),
    db
      .select()
      .from(trainingLogs)
      .where(
        and(
          eq(trainingLogs.userId, userId),
          or(
            eq(trainingLogs.activeUserId, userId),
            and(
              gte(trainingLogs.completedAt, day.start),
              lt(trainingLogs.completedAt, day.end),
            ),
          ),
        ),
      )
      .orderBy(desc(trainingLogs.startedAt)),
    db
      .select()
      .from(trainingLogs)
      .where(
        and(
          eq(trainingLogs.userId, userId),
          gte(trainingLogs.completedAt, week.start),
          lt(trainingLogs.completedAt, week.end),
        ),
      ),
    db
      .select()
      .from(weightLogs)
      .where(eq(weightLogs.userId, userId))
      .orderBy(desc(weightLogs.recordedAt))
      .limit(5),
    db
      .select()
      .from(trainingLogs)
      .where(
        and(
          eq(trainingLogs.userId, userId),
          gte(trainingLogs.completedAt, new Date(0)),
        ),
      )
      .orderBy(desc(trainingLogs.completedAt))
      .limit(5),
    getFitnessState(userId),
    db
      .select({ units: userProfiles.units })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1),
  ]);

  const meals = mealRows.map(mealRecord);
  const consumed = meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      proteinG: totals.proteinG + meal.proteinG,
      carbsG: totals.carbsG + meal.carbsG,
      fatG: totals.fatG + meal.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const targets = fitnessState?.plan.targets ?? null;
  const targetCalories = targets?.calories ?? null;
  const remainingCalories =
    targetCalories === null
      ? null
      : Math.max(0, targetCalories - consumed.calories);
  const overTargetCalories =
    targetCalories === null
      ? null
      : Math.max(0, consumed.calories - targetCalories);

  const active = workoutRows.find(
    (row) => row.activeUserId === userId && row.completedAt === null,
  );
  const todayCompleted = workoutRows
    .filter(
      (row) =>
        row.completedAt !== null &&
        row.completedAt >= day.start &&
        row.completedAt < day.end,
    )
    .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())[0];

  const completedWeek = weekWorkoutRows.filter(
    (row) => row.completedAt !== null,
  );
  const completedDays = new Set(
    completedWeek.map((row) => localDateKey(row.completedAt!, timeZone)),
  ).size;

  const progress = [
    ...progressWeights.map((row) => ({
      id: `weight-${row.id}`,
      type: "weight" as const,
      label: "Weight",
      recordedAt: iso(row.recordedAt),
      weightKg: Number(row.weightKg),
      timestamp: row.recordedAt.getTime(),
    })),
    ...progressWorkouts
      .filter((row) => row.completedAt !== null)
      .map((row) => ({
        id: `workout-${row.id}`,
        type: "workout" as const,
        label: "Workout",
        recordedAt: iso(row.completedAt!),
        timestamp: row.completedAt!.getTime(),
      })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
    .map(({ timestamp: _timestamp, ...record }) => record);

  let currentWeightKg: number | null =
    fitnessState?.plan.profile.weightKg ?? null;
  if (currentWeightKg === null) {
    const latestWeight = await db
      .select()
      .from(weightLogs)
      .where(eq(weightLogs.userId, userId))
      .orderBy(desc(weightLogs.recordedAt))
      .limit(1);
    currentWeightKg = latestWeight[0] ? Number(latestWeight[0].weightKg) : null;
  }

  return {
    dayLabel: localDayLabel(now, timeZone),
    timeZone,
    targets,
    consumed,
    remainingCalories,
    overTargetCalories,
    todayWorkout:
      active || todayCompleted
        ? workoutRecord(active ?? todayCompleted!)
        : null,
    plannedWorkout: fitnessState?.plan.workoutPlan ?? null,
    weekly: {
      completedSessions: completedWeek.length,
      completedDays,
      targetDays: fitnessState?.plan.workoutPlan.daysPerWeek ?? null,
    },
    currentWeightKg,
    units: fitnessState?.units ?? profileRows[0]?.units ?? "metric",
    recentProgress: progress,
    meals,
  };
}

// Explicit aliases make focused repository tests and future callers discoverable.
export const getSummary = getTrackingSummary;
export const createMealLog = logMeal;
export const createWeightLog = logWeight;
