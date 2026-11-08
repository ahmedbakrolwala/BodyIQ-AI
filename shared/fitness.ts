import { z } from "zod";

export const fitnessExperienceSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);

export const fitnessPrimaryGoalSchema = z.enum([
  "muscle_gain",
  "fat_loss",
  "maintenance",
  "strength",
  "general_fitness",
]);

export const fitnessActivityLevelSchema = z.enum([
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
]);

export const fitnessWorkoutLocationSchema = z.enum(["gym", "home"]);

export const fitnessDietaryPreferenceSchema = z.enum([
  "omnivore",
  "vegetarian",
  "vegan",
  "pescatarian",
  "eggetarian",
]);

export const fitnessUnitsSchema = z.enum(["metric", "imperial"]);

export const fitnessEquipmentSchema = z.enum([
  "bodyweight",
  "dumbbells",
  "barbell",
  "bench",
  "resistance_bands",
  "treadmill",
  "stationary_bike",
  "pullup_bar",
  "kettlebell",
]);

const normalizedAllergySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "allergy cannot be empty")
  .max(40, "allergy must be at most 40 characters");

const unique = <T>(values: T[]) => [...new Set(values)];

/**
 * Client-writable fitness fields. It is deliberately strict: ownership is
 * always taken from ctx.user.id, never from a client-supplied field.
 */
export const fitnessInputSchema = z
  .object({
    age: z.number().int().min(13).max(100),
    heightCm: z.number().finite().min(100).max(250),
    weightKg: z.number().finite().min(25).max(350),
    targetWeightKg: z.number().finite().min(25).max(350).nullable(),
    experience: fitnessExperienceSchema,
    primaryGoal: fitnessPrimaryGoalSchema,
    activityLevel: fitnessActivityLevelSchema,
    workoutLocation: fitnessWorkoutLocationSchema,
    equipment: z.array(fitnessEquipmentSchema).max(9).transform(unique),
    dietaryPreference: fitnessDietaryPreferenceSchema,
    allergies: z
      .array(normalizedAllergySchema)
      .max(20, "at most 20 allergies may be provided")
      .transform(unique),
    units: fitnessUnitsSchema,
    estimateEligible: z.boolean(),
  })
  .strict();

/** An empty, strict input prevents fitness.get from accepting a client userId. */
export const fitnessGetInputSchema = z.object({}).strict().optional();
export const fitnessSaveInputSchema = fitnessInputSchema;

export type FitnessInput = z.infer<typeof fitnessInputSchema>;
export type FitnessExperience = z.infer<typeof fitnessExperienceSchema>;
export type FitnessPrimaryGoal = z.infer<typeof fitnessPrimaryGoalSchema>;
export type FitnessActivityLevel = z.infer<typeof fitnessActivityLevelSchema>;
export type FitnessEquipment = z.infer<typeof fitnessEquipmentSchema>;
export type FitnessDietaryPreference = z.infer<
  typeof fitnessDietaryPreferenceSchema
>;
export type FitnessUnits = z.infer<typeof fitnessUnitsSchema>;

export type FitnessTargets = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  maintenanceLow: number | null;
  maintenanceHigh: number | null;
  note: string;
};

export type FitnessMeal = {
  name: string;
  ingredients: string[];
  note: string;
};

export type FitnessExercise = {
  name: string;
  sets: number;
  reps: string;
};

export type FitnessWorkoutPlan = {
  title: string;
  daysPerWeek: number;
  exercises: FitnessExercise[];
  note: string;
};

export type FitnessPlan = {
  profile: FitnessInput;
  targets: FitnessTargets;
  mealPlan: FitnessMeal[];
  workoutPlan: FitnessWorkoutPlan;
};

export const FITNESS_EQUIPMENT = fitnessEquipmentSchema.options;

export function centimetersToInches(value: number): number {
  return value / 2.54;
}

export function inchesToCentimeters(value: number): number {
  return value * 2.54;
}

export function kilogramsToPounds(value: number): number {
  return value * 2.2046226218;
}

export function poundsToKilograms(value: number): number {
  return value / 2.2046226218;
}

/** Values in FitnessInput remain heightCm/weightKg even when units is imperial. */
export function toMetricMeasurements(input: {
  height: number;
  weight: number;
  units: FitnessUnits;
}): { heightCm: number; weightKg: number } {
  return input.units === "imperial"
    ? {
        heightCm: inchesToCentimeters(input.height),
        weightKg: poundsToKilograms(input.weight),
      }
    : { heightCm: input.height, weightKg: input.weight };
}
