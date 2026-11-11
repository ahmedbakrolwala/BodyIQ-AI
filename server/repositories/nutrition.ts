import { and, desc, eq } from "drizzle-orm";
import {
  fitnessProfiles,
  mealPlanGroceries,
  mealPlanMeals,
  mealPlans,
} from "../../drizzle/schema";
import { fitnessInputSchema } from "../../shared/fitness";
import { deriveFitnessPlan } from "../../shared/fitness-planning";
import type {
  CatalogFood,
  CreateMealPlanInput,
  GroceryLine,
  MealPlanDetail,
  MealPlanSummary,
  SearchFoodsInput,
} from "../../shared/nutrition";
import { getDb } from "../db";
import {
  FOOD_CATALOG,
  catalogMatchesAllergies,
  normalized,
} from "../services/nutrition-catalog";
export class NutritionNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
}
export class NutritionMissingFitnessError extends Error {
  readonly code = "BAD_REQUEST" as const;
  constructor() {
    super("Save a fitness profile before generating a meal plan");
  }
}
async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured or reachable");
  return db;
}
function allowedFoods(
  input: CreateMealPlanInput,
  profile: ReturnType<typeof fitnessInputSchema.parse>,
) {
  const profileMode = profile.dietaryPreference;
  const requestedMode =
    input.dietaryMode === "profile" ? profileMode : input.dietaryMode;
  const mode =
    profileMode === "vegan" || profileMode === "vegetarian"
      ? "vegetarian"
      : profileMode === "pescatarian"
        ? "pescatarian"
        : profileMode === "eggetarian"
          ? "eggetarian"
          : requestedMode;
  return FOOD_CATALOG.filter(
    (food) =>
      (input.cuisine === "mixed" || food.cuisine === input.cuisine) &&
      (mode === "vegetarian"
        ? food.dietTags.includes("vegetarian")
        : mode === "pescatarian"
          ? food.id.includes("fish") || food.dietTags.includes("vegetarian")
          : mode === "eggetarian"
            ? food.dietTags.includes("vegetarian") || food.id.includes("egg")
            : mode !== "non_vegetarian" ||
              food.dietTags.includes("non_vegetarian")) &&
      !catalogMatchesAllergies(food, profile.allergies),
  );
}
function summary(row: typeof mealPlans.$inferSelect): MealPlanSummary {
  return {
    id: row.id,
    durationDays: row.durationDays,
    cuisine: row.cuisine,
    budget: row.budget,
    dietaryMode: row.dietaryMode,
    createdAt: new Date(row.createdAt).toISOString(),
    approximate: true,
  };
}
export function searchCatalog(
  input: SearchFoodsInput,
  allergies: string[],
  dietaryPreference: string,
): CatalogFood[] {
  const query = normalized(input.query);
  const vegetarian = ["vegetarian", "vegan"].includes(dietaryPreference);
  const pescatarian = dietaryPreference === "pescatarian";
  const eggetarian = dietaryPreference === "eggetarian";
  return FOOD_CATALOG.filter(
    (food) =>
      (!query ||
        normalized(
          [
            food.name,
            ...food.searchableTags,
            ...food.ingredients.map((i) => i.name),
          ].join(" "),
        ).includes(query)) &&
      (input.cuisine === "mixed" || food.cuisine === input.cuisine) &&
      (!vegetarian || food.dietTags.includes("vegetarian")) &&
      (!pescatarian ||
        food.dietTags.includes("vegetarian") ||
        food.id.includes("fish")) &&
      (!eggetarian ||
        food.dietTags.includes("vegetarian") ||
        food.id.includes("egg")) &&
      !catalogMatchesAllergies(food, allergies),
  ).slice(0, input.limit);
}
function scaleFood(food: CatalogFood, factor: number): CatalogFood {
  const round = (value: number) => Math.round(value * factor * 10) / 10;
  return {
    ...food,
    ingredients: food.ingredients.map((ingredient) => ({
      ...ingredient,
      quantity: round(ingredient.quantity),
    })),
    nutrition: {
      calories: round(food.nutrition.calories),
      proteinG: round(food.nutrition.proteinG),
      carbsG: round(food.nutrition.carbsG),
      fatG: round(food.nutrition.fatG),
    },
    estimatedCostInr: round(food.estimatedCostInr),
  };
}
export async function searchFoods(userId: number, input: SearchFoodsInput) {
  const db = await requireDb();
  const rows = await db
    .select({ profile: fitnessProfiles.profile })
    .from(fitnessProfiles)
    .where(eq(fitnessProfiles.userId, userId))
    .limit(1);
  const profile = rows[0] ? fitnessInputSchema.parse(rows[0].profile) : null;
  return searchCatalog(
    input,
    profile?.allergies ?? [],
    profile?.dietaryPreference ?? "omnivore",
  );
}
export async function createMealPlan(
  userId: number,
  input: CreateMealPlanInput,
): Promise<MealPlanDetail> {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ profile: fitnessProfiles.profile })
      .from(fitnessProfiles)
      .where(eq(fitnessProfiles.userId, userId))
      .limit(1);
    if (!rows[0]) throw new NutritionMissingFitnessError();
    const profile = fitnessInputSchema.parse(rows[0].profile);
    const derived = deriveFitnessPlan(profile);
    const foods = allowedFoods(input, profile);
    if (foods.length < 4)
      throw new Error("No catalog foods match the saved diet and allergies");
    const inserted = await tx.insert(mealPlans).values({
      userId,
      durationDays: input.durationDays,
      cuisine: input.cuisine,
      budget: input.budget,
      dietaryMode: input.dietaryMode,
      targetSnapshot: derived.targets,
      profileSnapshot: profile,
    });
    const planId = Number(
      (inserted as unknown as { insertId: number }).insertId,
    );
    const types = ["breakfast", "lunch", "dinner", "snack"] as const;
    const meals: Array<{
      day: number;
      mealType: (typeof types)[number];
      food: CatalogFood;
    }> = [];
    const budgetLimit =
      input.budget === "low"
        ? 140
        : input.budget === "standard"
          ? 220
          : Infinity;
    for (let day = 1; day <= input.durationDays; day++) {
      const dayMeals = [] as Array<{
        day: number;
        mealType: (typeof types)[number];
        food: CatalogFood;
      }>;
      for (let index = 0; index < 4; index++) {
        const pool = foods.filter(
          (food) =>
            food.estimatedCostInr <= budgetLimit &&
            (index === 3
              ? food.searchableTags.includes("snack")
              : !food.searchableTags.includes("snack")),
        );
        const food = (pool.length ? pool : foods)[
          (day - 1 + index) % (pool.length || foods.length)
        ];
        dayMeals.push({ day, mealType: types[index], food });
      }
      const baseCalories = dayMeals.reduce(
        (total, meal) => total + meal.food.nutrition.calories,
        0,
      );
      const requestedCalories = derived.targets.calories ?? baseCalories;
      const factor = Math.min(
        1.5,
        Math.max(0.65, requestedCalories / Math.max(1, baseCalories)),
      );
      meals.push(
        ...dayMeals.map((meal) => ({
          ...meal,
          food: scaleFood(meal.food, factor),
        })),
      );
    }
    await tx.insert(mealPlanMeals).values(
      meals.map((m) => ({
        planId,
        day: m.day,
        mealType: m.mealType,
        foodId: m.food.id,
        foodSnapshot: m.food,
        estimatedCostInr: m.food.estimatedCostInr,
      })),
    );
    const grocery = new Map<string, GroceryLine>();
    for (const meal of meals)
      for (const item of meal.food.ingredients) {
        const key = `${normalized(item.name)}|${item.unit}`;
        const old = grocery.get(key);
        grocery.set(key, {
          ingredient: item.name,
          quantity: (old?.quantity ?? 0) + item.quantity,
          unit: item.unit,
        });
      }
    const groceries = [...grocery.values()];
    if (groceries.length)
      await tx.insert(mealPlanGroceries).values(
        groceries.map((g) => ({
          planId,
          ingredient: g.ingredient,
          quantity: g.quantity,
          unit: g.unit,
        })),
      );
    return {
      ...summary({
        id: planId,
        durationDays: input.durationDays,
        cuisine: input.cuisine,
        budget: input.budget,
        dietaryMode: input.dietaryMode,
        createdAt: new Date(),
      } as typeof mealPlans.$inferSelect),
      meals: meals.map((m, i) => ({
        id: i + 1,
        day: m.day,
        mealType: m.mealType,
        food: m.food,
        estimatedCostInr: m.food.estimatedCostInr,
      })),
      groceries,
      target: {
        calories: derived.targets.calories ?? 0,
        proteinG: derived.targets.proteinG ?? 0,
        carbsG: derived.targets.carbsG ?? 0,
        fatG: derived.targets.fatG ?? 0,
      },
      note: "Approximate plan using estimated nutrition and costs; adjust portions and verify every ingredient for your allergies. Prices are not live.",
    };
  });
}
export async function listMealPlans(userId: number, limit = 20) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.userId, userId))
    .orderBy(desc(mealPlans.createdAt))
    .limit(limit);
  return rows.map(summary);
}
export async function getMealPlan(
  userId: number,
  planId: number,
): Promise<MealPlanDetail> {
  const db = await requireDb();
  const plans = await db
    .select()
    .from(mealPlans)
    .where(and(eq(mealPlans.id, planId), eq(mealPlans.userId, userId)))
    .limit(1);
  if (!plans[0]) throw new NutritionNotFoundError("Meal plan not found");
  const [mealRows, groceryRows] = await Promise.all([
    db
      .select()
      .from(mealPlanMeals)
      .where(eq(mealPlanMeals.planId, planId))
      .orderBy(mealPlanMeals.day),
    db
      .select()
      .from(mealPlanGroceries)
      .where(eq(mealPlanGroceries.planId, planId)),
  ]);
  const target = plans[0].targetSnapshot as {
    calories?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  };
  return {
    ...summary(plans[0]),
    meals: mealRows.map((m) => ({
      id: m.id,
      day: m.day,
      mealType: m.mealType,
      food: m.foodSnapshot as CatalogFood,
      estimatedCostInr: Number(m.estimatedCostInr),
    })),
    groceries: groceryRows.map((g) => ({
      ingredient: g.ingredient,
      quantity: Number(g.quantity),
      unit: g.unit,
    })),
    target: {
      calories: target.calories ?? 0,
      proteinG: target.proteinG ?? 0,
      carbsG: target.carbsG ?? 0,
      fatG: target.fatG ?? 0,
    },
    note: "Approximate plan using estimated nutrition and costs; verify every ingredient for your allergies. Prices are not live.",
  };
}
