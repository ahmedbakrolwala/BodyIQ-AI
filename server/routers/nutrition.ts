import { TRPCError } from "@trpc/server";
import {
  createMealPlanInputSchema,
  listMealPlansInputSchema,
  mealPlanIdInputSchema,
  searchFoodsInputSchema,
} from "../../shared/nutrition";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createMealPlan,
  getMealPlan,
  listMealPlans,
  NutritionMissingFitnessError,
  NutritionNotFoundError,
  searchFoods,
} from "../repositories/nutrition";
function mapNutritionError(error: unknown): never {
  if (error instanceof NutritionNotFoundError)
    throw new TRPCError({ code: "NOT_FOUND", message: error.message });
  if (error instanceof NutritionMissingFitnessError)
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  throw error;
}
export const nutritionRouter = router({
  searchFoods: protectedProcedure
    .input(searchFoodsInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await searchFoods(ctx.user.id, input);
      } catch (error) {
        return mapNutritionError(error);
      }
    }),
  createMealPlan: protectedProcedure
    .input(createMealPlanInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createMealPlan(ctx.user.id, input);
      } catch (error) {
        return mapNutritionError(error);
      }
    }),
  listMealPlans: protectedProcedure
    .input(listMealPlansInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await listMealPlans(ctx.user.id, input?.limit ?? 20);
      } catch (error) {
        return mapNutritionError(error);
      }
    }),
  getMealPlan: protectedProcedure
    .input(mealPlanIdInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getMealPlan(ctx.user.id, input.planId);
      } catch (error) {
        return mapNutritionError(error);
      }
    }),
});
