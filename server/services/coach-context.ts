import { and, desc, eq, isNotNull } from "drizzle-orm";
import {
  fitnessProfiles,
  foodLogs,
  trainingLogs,
  userProfiles,
} from "../../drizzle/schema";
import { fitnessInputSchema } from "../../shared/fitness";
import { deriveFitnessPlan } from "../../shared/fitness-planning";
import type { CoachContext } from "../../shared/coach";
import { getDb } from "../db";

const clip = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max)}…` : value;
export async function buildCoachContext(userId: number): Promise<CoachContext> {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured or reachable");
  const [fitness, profile, meals, workouts] = await Promise.all([
    db
      .select()
      .from(fitnessProfiles)
      .where(eq(fitnessProfiles.userId, userId))
      .limit(1),
    db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1),
    db
      .select()
      .from(foodLogs)
      .where(eq(foodLogs.userId, userId))
      .orderBy(desc(foodLogs.recordedAt))
      .limit(20),
    db
      .select()
      .from(trainingLogs)
      .where(
        and(
          eq(trainingLogs.userId, userId),
          isNotNull(trainingLogs.completedAt),
        ),
      )
      .orderBy(desc(trainingLogs.completedAt))
      .limit(10),
  ]);
  let profileText =
    "No saved fitness profile is available. Do not infer age, body measurements, goals, allergies, diet or targets.";
  if (fitness[0]) {
    const input = fitnessInputSchema.parse(fitness[0].profile);
    const plan = deriveFitnessPlan(input);
    profileText = JSON.stringify({
      age: input.age,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      targetWeightKg: input.targetWeightKg,
      experience: input.experience,
      goal: input.primaryGoal,
      activity: input.activityLevel,
      workoutLocation: input.workoutLocation,
      equipment: input.equipment,
      diet: input.dietaryPreference,
      allergies: input.allergies,
      units: input.units,
      estimatedTargets: plan.targets,
      displayName: profile[0]?.displayName ?? "unknown",
    });
  }
  const nutritionText = meals.length
    ? meals.map((m) => ({
        name: m.name,
        mealType: m.mealType,
        calories: Number(m.calories),
        proteinG: Number(m.proteinG),
        carbsG: Number(m.carbsG),
        fatG: Number(m.fatG),
        recordedAt: m.recordedAt.toISOString(),
      }))
    : "No approved food logs are available.";
  const workoutText = workouts.length
    ? workouts.map((w) => ({
        name: w.name,
        startedAt: w.startedAt.toISOString(),
        completedAt: w.completedAt?.toISOString() ?? null,
      }))
    : "No completed workouts are available.";
  return {
    profile: clip(JSON.stringify(profileText), 5000),
    nutrition: clip(JSON.stringify(nutritionText), 6000),
    workouts: clip(JSON.stringify(workoutText), 5000),
  };
}
