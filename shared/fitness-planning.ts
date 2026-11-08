import type {
  FitnessExercise,
  FitnessInput,
  FitnessMeal,
  FitnessPlan,
  FitnessTargets,
  FitnessWorkoutPlan,
} from "./fitness";

const ACTIVITY_FACTORS: Record<FitnessInput["activityLevel"], number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

const MIN_CALORIES = 1500;
const MAX_CALORIES = 4500;
const UNKNOWN_SEX_OFFSET = -78;
const FEMALE_OFFSET = -161;
const MALE_OFFSET = 5;
const COMMON_ALLERGENS = new Set([
  "dairy",
  "eggs",
  "fish",
  "shellfish",
  "peanuts",
  "tree_nuts",
  "wheat",
  "soy",
  "sesame",
]);

const roundTo = (value: number, nearest: number) =>
  Math.round(value / nearest) * nearest;

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

function bmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function normalizedAllergyKey(value: string): string {
  return value.trim().toLowerCase().replace(/[ -]+/g, "_");
}

function estimateBmr(input: FitnessInput, sexOffset: number): number {
  return (
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexOffset
  );
}

function unavailableTargets(reason: string): FitnessTargets {
  return {
    calories: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
    maintenanceLow: null,
    maintenanceHigh: null,
    note: reason,
  };
}

/**
 * Mifflin-St Jeor is shown as a range because sex is intentionally not
 * collected. The midpoint is used for a single planning estimate.
 */
export function estimateFitnessTargets(input: FitnessInput): FitnessTargets {
  if (input.age < 18) {
    return unavailableTargets(
      "Estimates are unavailable for people under 18; use clinician-guided advice.",
    );
  }
  if (!input.estimateEligible) {
    return unavailableTargets(
      "Estimates are disabled for this profile. Use clinician-guided advice instead.",
    );
  }

  const activityFactor = ACTIVITY_FACTORS[input.activityLevel];
  const maintenanceLowRaw = estimateBmr(input, FEMALE_OFFSET) * activityFactor;
  const maintenanceHighRaw = estimateBmr(input, MALE_OFFSET) * activityFactor;
  const maintenanceMidpoint =
    estimateBmr(input, UNKNOWN_SEX_OFFSET) * activityFactor;
  const currentBmi = bmi(input.weightKg, input.heightCm);
  const targetBmi =
    input.targetWeightKg === null
      ? null
      : bmi(input.targetWeightKg, input.heightCm);
  const cutNotAllowed =
    input.primaryGoal === "fat_loss" &&
    (currentBmi < 18.5 || (targetBmi !== null && targetBmi < 18.5));

  let calorieTarget = maintenanceMidpoint;
  let goalNote =
    "Maintenance estimate; adjust using progress and hunger signals.";
  if (input.primaryGoal === "muscle_gain") {
    calorieTarget += 200;
    goalNote =
      "Modest surplus estimate for muscle gain; not a guaranteed outcome.";
  } else if (input.primaryGoal === "fat_loss" && !cutNotAllowed) {
    const deficit = Math.min(250, maintenanceMidpoint * 0.15);
    calorieTarget -= deficit;
    goalNote = "Modest deficit estimate; avoid aggressive restriction.";
  } else if (cutNotAllowed) {
    goalNote =
      "Fat-loss cuts are not applied because current or target BMI is below 18.5; maintenance guidance is shown instead.";
  }

  const low = clamp(roundTo(maintenanceLowRaw, 25), MIN_CALORIES, MAX_CALORIES);
  const high = clamp(
    roundTo(maintenanceHighRaw, 25),
    MIN_CALORIES,
    MAX_CALORIES,
  );
  const unclampedCalories = calorieTarget;
  const calories = clamp(
    roundTo(calorieTarget, 25),
    MIN_CALORIES,
    MAX_CALORIES,
  );
  const proteinG = roundTo(input.weightKg * 1.6, 5);
  const fatG = roundTo((calories * 0.3) / 9, 5);
  const carbsG = roundTo(
    Math.max(0, (calories - proteinG * 4 - fatG * 9) / 4),
    5,
  );
  const clampNote =
    unclampedCalories < MIN_CALORIES || unclampedCalories > MAX_CALORIES
      ? " Calorie output was clamped to the conservative adult range of 1500–4500 kcal."
      : "";

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    maintenanceLow: Math.min(low, high),
    maintenanceHigh: Math.max(low, high),
    note: `Approximate Mifflin-St Jeor range using an unknown-sex midpoint; ${goalNote}${clampNote} Macros are rounded guidance, not a precise prescription.`,
  };
}

type MealTemplate = FitnessMeal & { allergens: string[] };

const MEAL_TEMPLATES: MealTemplate[] = [
  {
    name: "Breakfast",
    ingredients: [
      "Rolled oats (guidance portion: 1 cup)",
      "Greek yogurt (guidance portion: 3/4 cup)",
      "Berries (guidance portion: 1 cup)",
      "Chia seeds (guidance portion: 1 tablespoon)",
    ],
    note: "Portions are guidance for a balanced meal, not a perfect macro target.",
    allergens: ["dairy"],
  },
  {
    name: "Lunch",
    ingredients: [
      "Chicken, lentils, or beans (guidance portion: 1 palm-sized serving)",
      "Brown rice or quinoa (guidance portion: 1 cup cooked)",
      "Mixed vegetables (guidance portion: 2 cups)",
      "Olive oil and herbs (guidance portion: 1 teaspoon)",
    ],
    note: "Choose the protein that fits the dietary preference; portions are flexible guidance.",
    allergens: [],
  },
  {
    name: "Dinner",
    ingredients: [
      "Tofu, eggs, fish, or beans (guidance portion: 1 palm-sized serving)",
      "Potato or whole-grain side (guidance portion: 1 cup)",
      "Leafy greens and vegetables (guidance portion: 2 cups)",
      "Lemon, spices, and a small amount of oil",
    ],
    note: "Select a suitable protein option; portions are guidance, not a precise macro target.",
    allergens: ["soy", "eggs", "fish"],
  },
];

function filterMealTemplates(input: FitnessInput): FitnessMeal[] {
  const allergies = input.allergies.map(normalizedAllergyKey);
  if (allergies.some((allergy) => !COMMON_ALLERGENS.has(allergy))) {
    return [];
  }
  // Build the final ingredient list first, then verify its allergen metadata.
  const proteins = [
    { name: "beans or lentils", allergen: null },
    ...(input.dietaryPreference === "omnivore"
      ? [{ name: "chicken", allergen: null }]
      : []),
    ...(["omnivore", "pescatarian"].includes(input.dietaryPreference)
      ? [{ name: "fish", allergen: "fish" }]
      : []),
    ...(["omnivore", "eggetarian"].includes(input.dietaryPreference)
      ? [{ name: "eggs", allergen: "eggs" }]
      : []),
    { name: "tofu", allergen: "soy" },
  ].filter((food) => !food.allergen || !allergies.includes(food.allergen));
  return MEAL_TEMPLATES.map((template) => {
    const ingredients = [...template.ingredients];
    let allergens: string[] = [];
    if (template.name === "Breakfast") {
      const useOatDrink =
        input.dietaryPreference === "vegan" || allergies.includes("dairy");
      ingredients[1] = useOatDrink
        ? "Fortified oat drink (guidance portion: 3/4 cup; check allergen label)"
        : "Greek yogurt (guidance portion: 3/4 cup)";
      allergens = useOatDrink ? [] : ["dairy"];
      if (allergies.includes("wheat"))
        ingredients[0] =
          "Wheat-free rolled oats (guidance portion: 1 cup; verify labeling and cross-contact)";
    } else {
      ingredients[0] =
        proteins.map((food) => food.name).join(" or ") +
        " (guidance portion: 1 palm-sized serving)";
      allergens = proteins.flatMap((food) =>
        food.allergen ? [food.allergen] : [],
      );
      if (template.name === "Dinner")
        ingredients[1] = "Potato (guidance portion: 1 cup)";
    }
    return { ...template, ingredients, allergens };
  })
    .filter((meal) =>
      meal.allergens.every((allergen) => !allergies.includes(allergen)),
    )
    .map(({ allergens: _allergens, ...meal }) => meal);
}

export function buildMealPlan(input: FitnessInput): FitnessMeal[] {
  return filterMealTemplates(input);
}

const has = (
  input: FitnessInput,
  equipment: FitnessInput["equipment"][number],
) => input.equipment.includes(equipment);

function addExercise(
  exercises: FitnessExercise[],
  name: string,
  sets: number,
  reps: string,
): void {
  if (!exercises.some((exercise) => exercise.name === name)) {
    exercises.push({ name, sets, reps });
  }
}

export function buildWorkoutPlan(input: FitnessInput): FitnessWorkoutPlan {
  const exercises: FitnessExercise[] = [];
  const isBeginner = input.experience === "beginner";
  const sets = isBeginner ? 2 : input.experience === "intermediate" ? 3 : 4;
  const reps = input.primaryGoal === "strength" ? "5–8" : "8–12";

  if (has(input, "barbell")) {
    addExercise(exercises, "Barbell squat", sets, reps);
    addExercise(
      exercises,
      has(input, "bench") ? "Barbell bench press" : "Barbell floor press",
      sets,
      reps,
    );
    addExercise(exercises, "Barbell row", sets, reps);
  } else if (has(input, "dumbbells")) {
    addExercise(exercises, "Dumbbell goblet squat", sets, reps);
    addExercise(
      exercises,
      has(input, "bench") ? "Dumbbell bench press" : "Dumbbell floor press",
      sets,
      reps,
    );
    addExercise(exercises, "One-arm dumbbell row", sets, reps);
  } else if (has(input, "kettlebell")) {
    addExercise(exercises, "Kettlebell squat", sets, reps);
    addExercise(exercises, "Kettlebell deadlift", sets, reps);
    addExercise(exercises, "Kettlebell row", sets, reps);
  } else if (has(input, "resistance_bands")) {
    addExercise(exercises, "Band squat", sets, reps);
    addExercise(exercises, "Band chest press", sets, reps);
    addExercise(exercises, "Band row", sets, reps);
  } else {
    addExercise(exercises, "Bodyweight squat", sets, reps);
    addExercise(exercises, "Push-up", sets, isBeginner ? "6–10" : "8–15");
    addExercise(exercises, "Reverse lunge", sets, "8–12 each side");
  }

  if (has(input, "pullup_bar")) {
    addExercise(exercises, "Pull-up or assisted pull-up", sets, "as able");
  } else if (
    !has(input, "barbell") &&
    !has(input, "dumbbells") &&
    !has(input, "resistance_bands")
  ) {
    addExercise(exercises, "Prone Y-T raise", sets, "10–15");
  }

  addExercise(exercises, "Plank", isBeginner ? 2 : 3, "20–45 seconds");

  if (
    input.primaryGoal === "fat_loss" ||
    input.primaryGoal === "general_fitness"
  ) {
    if (has(input, "treadmill")) {
      addExercise(exercises, "Treadmill brisk walk", 1, "15–25 minutes");
    } else if (has(input, "stationary_bike")) {
      addExercise(exercises, "Stationary bike", 1, "15–25 minutes");
    } else {
      addExercise(exercises, "Brisk walk", 1, "15–25 minutes");
    }
  }

  const baseDays = isBeginner ? 3 : input.experience === "intermediate" ? 4 : 5;
  const daysPerWeek =
    input.primaryGoal === "strength" ? baseDays : Math.min(baseDays, 4);
  const equipmentDescription =
    input.equipment.length > 0 ? input.equipment.join(", ") : "bodyweight only";

  return {
    title: `${input.experience[0].toUpperCase()}${input.experience.slice(1)} ${input.primaryGoal.replace("_", " ")} plan`,
    daysPerWeek,
    exercises,
    note: `Designed for ${input.workoutLocation} with ${equipmentDescription}. Start conservatively, use controlled form, and progress gradually. This is general education, not medical advice.`,
  };
}

export function deriveFitnessPlan(input: FitnessInput): FitnessPlan {
  return {
    profile: input,
    targets: estimateFitnessTargets(input),
    mealPlan: buildMealPlan(input),
    workoutPlan: buildWorkoutPlan(input),
  };
}

export const calculateFitnessTargets = estimateFitnessTargets;
export const createMealPlan = buildMealPlan;
export const createWorkoutPlan = buildWorkoutPlan;
