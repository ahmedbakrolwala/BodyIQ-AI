import { z } from "zod";
import { fitnessDietaryPreferenceSchema } from "./fitness";
import { mealTypeSchema } from "./tracking";

export const cuisineSchema = z.enum(["indian", "international", "mixed"]);
export const budgetTierSchema = z.enum(["low", "standard", "flexible"]);
export const dietaryModeSchema = z.enum([
  "profile",
  "vegetarian",
  "non_vegetarian",
]);
export const durationSchema = z.union([
  z.literal(1),
  z.literal(7),
  z.literal(30),
]);
export const ingredientSchema = z
  .object({
    name: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
  })
  .strict();
export const nutritionEstimateSchema = z
  .object({
    calories: z.number().nonnegative(),
    proteinG: z.number().nonnegative(),
    carbsG: z.number().nonnegative(),
    fatG: z.number().nonnegative(),
  })
  .strict();
export const catalogFoodSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    cuisine: z.enum(["indian", "international"]),
    dietTags: z.array(z.enum(["vegetarian", "non_vegetarian"])),
    ingredients: z.array(ingredientSchema),
    nutrition: nutritionEstimateSchema,
    estimatedCostInr: z.number().nonnegative(),
    searchableTags: z.array(z.string()),
  })
  .strict();
export const searchFoodsInputSchema = z
  .object({
    query: z.string().trim().max(80).default(""),
    cuisine: cuisineSchema.default("mixed"),
    limit: z.number().int().min(1).max(50).default(25),
  })
  .strict();
export const createMealPlanInputSchema = z
  .object({
    durationDays: durationSchema,
    cuisine: cuisineSchema,
    budget: budgetTierSchema,
    dietaryMode: dietaryModeSchema,
  })
  .strict();
export const listMealPlansInputSchema = z
  .object({ limit: z.number().int().min(1).max(50).default(20) })
  .strict()
  .optional();
export const mealPlanIdInputSchema = z
  .object({ planId: z.number().int().positive() })
  .strict();
export type Cuisine = z.infer<typeof cuisineSchema>;
export type BudgetTier = z.infer<typeof budgetTierSchema>;
export type DietaryMode = z.infer<typeof dietaryModeSchema>;
export type CatalogFood = z.infer<typeof catalogFoodSchema>;
export type NutritionEstimate = z.infer<typeof nutritionEstimateSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type SearchFoodsInput = z.infer<typeof searchFoodsInputSchema>;
export type CreateMealPlanInput = z.infer<typeof createMealPlanInputSchema>;
export type MealPlanMeal = {
  id: number;
  day: number;
  mealType: z.infer<typeof mealTypeSchema>;
  food: CatalogFood;
  estimatedCostInr: number;
};
export type GroceryLine = {
  ingredient: string;
  quantity: number;
  unit: string;
};
export type MealPlanSummary = {
  id: number;
  durationDays: number;
  cuisine: Cuisine;
  budget: BudgetTier;
  dietaryMode: DietaryMode;
  createdAt: string;
  approximate: true;
};
export type MealPlanDetail = MealPlanSummary & {
  meals: MealPlanMeal[];
  groceries: GroceryLine[];
  target: NutritionEstimate;
  note: string;
};
export const updateMealInputSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1).max(100).optional(),
    mealType: mealTypeSchema.optional(),
    calories: z.number().finite().min(0).max(10000).optional(),
    proteinG: z.number().finite().min(0).max(1000).optional(),
    carbsG: z.number().finite().min(0).max(1000).optional(),
    fatG: z.number().finite().min(0).max(1000).optional(),
  })
  .strict()
  .refine(
    (v) => Object.keys(v).length > 1,
    "At least one meal field is required",
  );
export const deleteMealInputSchema = z
  .object({ id: z.number().int().positive() })
  .strict();
export type UpdateMealInput = z.infer<typeof updateMealInputSchema>;
export type DeleteMealInput = z.infer<typeof deleteMealInputSchema>;
export type FitnessDietaryPreference = z.infer<
  typeof fitnessDietaryPreferenceSchema
>;
