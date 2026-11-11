import type {
  ExerciseCatalogEntry,
  WorkoutSelection,
} from "../../shared/workouts";

export const EXERCISE_CATALOG: readonly ExerciseCatalogEntry[] = [
  {
    key: "goblet_squat",
    name: "Goblet squat",
    targetMuscles: ["legs", "glutes"],
    instructions: "Brace, sit between the hips, drive through the whole foot.",
    defaultSets: 3,
    defaultReps: "8-12",
    defaultRestSeconds: 90,
    equipment: ["dumbbells", "kettlebell"],
    locations: ["gym", "home"],
    goalTags: ["muscle_gain", "fat_loss", "general_fitness", "strength"],
    muscleGroups: ["legs", "glutes"],
  },
  {
    key: "barbell_squat",
    name: "Barbell back squat",
    targetMuscles: ["legs", "glutes"],
    instructions:
      "Keep the bar balanced, brace, descend under control, and stand tall.",
    defaultSets: 4,
    defaultReps: "5-8",
    defaultRestSeconds: 150,
    equipment: ["barbell"],
    locations: ["gym"],
    goalTags: ["muscle_gain", "strength"],
    muscleGroups: ["legs", "glutes"],
  },
  {
    key: "push_up",
    name: "Push-up",
    targetMuscles: ["chest", "triceps", "core"],
    instructions:
      "Keep a straight line from shoulders to heels and lower with control.",
    defaultSets: 3,
    defaultReps: "8-15",
    defaultRestSeconds: 75,
    equipment: ["bodyweight"],
    locations: ["gym", "home"],
    goalTags: ["muscle_gain", "fat_loss", "general_fitness", "strength"],
    muscleGroups: ["chest", "triceps", "core"],
  },
  {
    key: "bench_press",
    name: "Barbell bench press",
    targetMuscles: ["chest", "triceps"],
    instructions:
      "Set the shoulders, lower the bar to mid-chest, then press evenly.",
    defaultSets: 4,
    defaultReps: "5-8",
    defaultRestSeconds: 150,
    equipment: ["barbell", "bench"],
    locations: ["gym"],
    goalTags: ["muscle_gain", "strength"],
    muscleGroups: ["chest", "triceps"],
  },
  {
    key: "one_arm_row",
    name: "One-arm dumbbell row",
    targetMuscles: ["back", "biceps"],
    instructions:
      "Brace on the bench, pull the elbow toward the hip, and lower slowly.",
    defaultSets: 3,
    defaultReps: "8-12",
    defaultRestSeconds: 90,
    equipment: ["dumbbells", "bench"],
    locations: ["gym", "home"],
    goalTags: ["muscle_gain", "strength", "general_fitness"],
    muscleGroups: ["back", "biceps"],
  },
  {
    key: "pull_up",
    name: "Pull-up",
    targetMuscles: ["back", "biceps"],
    instructions:
      "Start from a controlled hang and pull the chest toward the bar.",
    defaultSets: 3,
    defaultReps: "as able",
    defaultRestSeconds: 120,
    equipment: ["pullup_bar"],
    locations: ["gym", "home"],
    goalTags: ["muscle_gain", "strength", "general_fitness"],
    muscleGroups: ["back", "biceps"],
  },
  {
    key: "overhead_press",
    name: "Dumbbell overhead press",
    targetMuscles: ["shoulders", "triceps"],
    instructions: "Press overhead without leaning back; lower under control.",
    defaultSets: 3,
    defaultReps: "8-12",
    defaultRestSeconds: 90,
    equipment: ["dumbbells"],
    locations: ["gym", "home"],
    goalTags: ["muscle_gain", "strength", "general_fitness"],
    muscleGroups: ["shoulders", "triceps"],
  },
  {
    key: "romanian_deadlift",
    name: "Romanian deadlift",
    targetMuscles: ["hamstrings", "glutes", "back"],
    instructions:
      "Hinge at the hips with a neutral back and keep the weight close.",
    defaultSets: 3,
    defaultReps: "8-12",
    defaultRestSeconds: 120,
    equipment: ["dumbbells", "barbell"],
    locations: ["gym", "home"],
    goalTags: ["muscle_gain", "strength"],
    muscleGroups: ["hamstrings", "glutes", "back"],
  },
  {
    key: "reverse_lunge",
    name: "Reverse lunge",
    targetMuscles: ["legs", "glutes"],
    instructions:
      "Step back softly, keep the front knee aligned, and drive up.",
    defaultSets: 3,
    defaultReps: "8-12 each side",
    defaultRestSeconds: 75,
    equipment: ["bodyweight", "dumbbells"],
    locations: ["gym", "home"],
    goalTags: ["muscle_gain", "fat_loss", "general_fitness"],
    muscleGroups: ["legs", "glutes"],
  },
  {
    key: "plank",
    name: "Front plank",
    targetMuscles: ["core"],
    instructions: "Brace the trunk and keep ribs and pelvis stacked.",
    defaultSets: 3,
    defaultReps: "30-60 sec",
    defaultRestSeconds: 60,
    equipment: ["bodyweight"],
    locations: ["gym", "home"],
    goalTags: ["fat_loss", "general_fitness", "strength"],
    muscleGroups: ["core"],
  },
  {
    key: "cable_row",
    name: "Seated cable row",
    targetMuscles: ["back", "biceps"],
    instructions: "Pull toward the ribs, pause, and return without rocking.",
    defaultSets: 3,
    defaultReps: "8-12",
    defaultRestSeconds: 90,
    equipment: ["cable_machine"],
    locations: ["gym"],
    goalTags: ["muscle_gain", "strength", "general_fitness"],
    muscleGroups: ["back", "biceps"],
  },
  {
    key: "calf_raise",
    name: "Standing calf raise",
    targetMuscles: ["calves"],
    instructions: "Rise through the balls of the feet and pause at the top.",
    defaultSets: 3,
    defaultReps: "12-20",
    defaultRestSeconds: 60,
    equipment: ["bodyweight", "machine"],
    locations: ["gym", "home"],
    goalTags: ["muscle_gain", "general_fitness"],
    muscleGroups: ["calves"],
  },
];

export function filterCatalog(
  selection: WorkoutSelection,
): ExerciseCatalogEntry[] {
  return EXERCISE_CATALOG.filter(
    (exercise) =>
      exercise.locations.includes(selection.location) &&
      exercise.goalTags.includes(selection.goal) &&
      (!selection.muscleGroup ||
        exercise.muscleGroups.includes(selection.muscleGroup)) &&
      selection.equipment.every(
        (item) =>
          exercise.equipment.includes(item) ||
          (item === "bodyweight" && exercise.equipment.includes("bodyweight")),
      ),
  );
}

export function buildWorkoutSnapshot(
  selection: WorkoutSelection,
): (ExerciseCatalogEntry & { order: number })[] {
  const candidates = filterCatalog(selection);
  const desired =
    selection.split === "individual_muscle_group"
      ? 4
      : selection.split === "push_pull_legs"
        ? 5
        : 6;
  return candidates
    .slice(0, desired)
    .map((exercise, index) => ({ ...exercise, order: index + 1 }));
}
