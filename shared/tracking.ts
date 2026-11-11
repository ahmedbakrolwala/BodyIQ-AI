import { z } from "zod";
import type {
  FitnessExercise,
  FitnessTargets,
  FitnessWorkoutPlan,
} from "./fitness";

/** A valid IANA time-zone identifier, normalized only for surrounding whitespace. */
export const timeZoneSchema = z
  .string()
  .trim()
  .min(1, "timeZone is required")
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "timeZone must be a valid IANA time zone");

export const clientIdSchema = z.string().uuid("clientId must be a UUID");
export const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

export const trackingGetInputSchema = z
  .object({ timeZone: timeZoneSchema })
  .strict();

export const logMealInputSchema = z
  .object({
    clientId: clientIdSchema,
    name: z.string().trim().min(1).max(100),
    mealType: mealTypeSchema,
    calories: z.number().finite().min(0).max(10_000),
    proteinG: z.number().finite().min(0).max(1_000),
    carbsG: z.number().finite().min(0).max(1_000),
    fatG: z.number().finite().min(0).max(1_000),
    timeZone: timeZoneSchema,
  })
  .strict();

export const updateMealInputSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1).max(100).optional(),
    mealType: mealTypeSchema.optional(),
    calories: z.number().finite().min(0).max(10_000).optional(),
    proteinG: z.number().finite().min(0).max(1_000).optional(),
    carbsG: z.number().finite().min(0).max(1_000).optional(),
    fatG: z.number().finite().min(0).max(1_000).optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 1,
    "At least one meal field is required",
  );
export const deleteMealInputSchema = z
  .object({ id: z.number().int().positive() })
  .strict();

export const startWorkoutInputSchema = z
  .object({ clientId: clientIdSchema, timeZone: timeZoneSchema })
  .strict();

export const completeWorkoutInputSchema = z
  .object({ id: z.number().int().positive() })
  .strict();

export const logWeightInputSchema = z
  .object({
    clientId: clientIdSchema,
    weightKg: z.number().finite().min(25).max(350),
    timeZone: timeZoneSchema,
  })
  .strict();

export type MealType = z.infer<typeof mealTypeSchema>;
export type TrackingGetInput = z.infer<typeof trackingGetInputSchema>;
export type LogMealInput = z.infer<typeof logMealInputSchema>;
export type UpdateMealInput = z.infer<typeof updateMealInputSchema>;
export type DeleteMealInput = z.infer<typeof deleteMealInputSchema>;
export type StartWorkoutInput = z.infer<typeof startWorkoutInputSchema>;
export type CompleteWorkoutInput = z.infer<typeof completeWorkoutInputSchema>;
export type LogWeightInput = z.infer<typeof logWeightInputSchema>;

export type MealRecord = {
  id: number;
  name: string;
  mealType: MealType;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  recordedAt: string;
};

export type WorkoutRecord = {
  id: number;
  name: string;
  startedAt: string;
  completedAt: string | null;
  exercises: FitnessExercise[];
};

export type ProgressRecord = {
  id: string;
  type: "weight" | "workout";
  label: string;
  recordedAt: string;
  weightKg?: number;
};

export type TrackingSummary = {
  dayLabel: string;
  timeZone: string;
  targets: FitnessTargets | null;
  consumed: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  remainingCalories: number | null;
  overTargetCalories: number | null;
  todayWorkout: WorkoutRecord | null;
  plannedWorkout: FitnessWorkoutPlan | null;
  weekly: {
    completedSessions: number;
    completedDays: number;
    targetDays: number | null;
  };
  currentWeightKg: number | null;
  units: "metric" | "imperial";
  recentProgress: Array<ProgressRecord>;
  meals: Array<MealRecord>;
};

export type WeightRecord = { weightKg: number; recordedAt: string };
