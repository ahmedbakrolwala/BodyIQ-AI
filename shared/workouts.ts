import { z } from "zod";

export const workoutGoalSchema = z.enum([
  "muscle_gain",
  "fat_loss",
  "strength",
  "general_fitness",
]);
export const workoutLocationSchema = z.enum(["gym", "home"]);
export const workoutSplitSchema = z.enum([
  "full_body",
  "upper_lower",
  "push_pull_legs",
  "individual_muscle_group",
]);
export const workoutMuscleGroupSchema = z.enum([
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "hamstrings",
  "calves",
  "core",
]);
export const workoutEquipmentSchema = z.enum([
  "bodyweight",
  "dumbbells",
  "barbell",
  "bench",
  "cable_machine",
  "pullup_bar",
  "kettlebell",
  "resistance_bands",
  "machine",
]);

export const workoutSelectionSchema = z
  .object({
    goal: workoutGoalSchema,
    location: workoutLocationSchema,
    split: workoutSplitSchema,
    muscleGroup: workoutMuscleGroupSchema.nullable().default(null),
    equipment: z.array(workoutEquipmentSchema).max(20).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.split === "individual_muscle_group" && !value.muscleGroup) {
      ctx.addIssue({
        code: "custom",
        path: ["muscleGroup"],
        message: "muscleGroup is required for an individual muscle-group plan",
      });
    }
    if (value.split !== "individual_muscle_group" && value.muscleGroup) {
      ctx.addIssue({
        code: "custom",
        path: ["muscleGroup"],
        message:
          "muscleGroup is only valid for an individual muscle-group plan",
      });
    }
  });

export const generateWorkoutPlanInputSchema = workoutSelectionSchema;
export const getWorkoutPlanInputSchema = z
  .object({ planId: z.number().int().positive() })
  .strict();
export const startWorkoutSessionInputSchema = z
  .object({ planId: z.number().int().positive(), clientId: z.string().uuid() })
  .strict();
export const sessionIdInputSchema = z
  .object({ sessionId: z.number().int().positive() })
  .strict();
export const logWorkoutSetInputSchema = z
  .object({
    sessionId: z.number().int().positive(),
    exerciseId: z.number().int().positive(),
    setNumber: z.number().int().positive(),
    reps: z.number().int().positive().max(1000),
    weightKg: z.number().finite().min(0).max(1000),
    clientId: z.string().uuid(),
  })
  .strict();
export const replaceWorkoutExerciseInputSchema = z
  .object({
    sessionId: z.number().int().positive(),
    exerciseId: z.number().int().positive(),
    replacementExerciseId: z.number().int().positive(),
  })
  .strict();
export const skipWorkoutExerciseInputSchema = z
  .object({
    sessionId: z.number().int().positive(),
    exerciseId: z.number().int().positive(),
  })
  .strict();
export const workoutHistoryInputSchema = z
  .object({ limit: z.number().int().min(1).max(100).default(20) })
  .strict()
  .optional();
export type WorkoutGoal = z.infer<typeof workoutGoalSchema>;
export type WorkoutLocation = z.infer<typeof workoutLocationSchema>;
export type WorkoutSplit = z.infer<typeof workoutSplitSchema>;
export type WorkoutMuscleGroup = z.infer<typeof workoutMuscleGroupSchema>;
export type WorkoutEquipment = z.infer<typeof workoutEquipmentSchema>;
export type WorkoutSelection = z.infer<typeof workoutSelectionSchema>;

export type ExerciseCatalogEntry = {
  key: string;
  name: string;
  targetMuscles: WorkoutMuscleGroup[];
  instructions: string;
  defaultSets: number;
  defaultReps: string;
  defaultRestSeconds: number;
  equipment: WorkoutEquipment[];
  locations: WorkoutLocation[];
  goalTags: WorkoutGoal[];
  muscleGroups: WorkoutMuscleGroup[];
  demonstration?: { url?: string; provider?: string };
};
export type WorkoutPlanExercise = ExerciseCatalogEntry & { order: number };

/** Epley estimate, intentionally labeled estimated: max(weight * (1 + reps / 30), best weight). */
export function deriveEstimatedRecord(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return Math.round(Math.max(weightKg, weightKg * (1 + reps / 30)) * 10) / 10;
}

export type WorkoutRecord = {
  exerciseId: number;
  exerciseName: string;
  estimatedOneRepMaxKg: number;
  bestWeightKg: number;
  reps: number;
  label: "estimated";
};
