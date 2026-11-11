import { TRPCError } from "@trpc/server";
import {
  completeWorkoutInputSchema,
  deleteMealInputSchema,
  logMealInputSchema,
  logWeightInputSchema,
  startWorkoutInputSchema,
  trackingGetInputSchema,
  updateMealInputSchema,
} from "../../shared/tracking";
import { protectedProcedure, router } from "../_core/trpc";
import {
  completeWorkout,
  deleteMeal,
  getTrackingSummary,
  logMeal,
  logWeight,
  MissingFitnessError,
  startWorkout,
  TrackingConflictError,
  TrackingNotFoundError,
  updateMeal,
} from "../repositories/tracking";
function rethrowTrackingError(error: unknown): never {
  if (error instanceof TrackingConflictError)
    throw new TRPCError({ code: "CONFLICT", message: error.message });
  if (error instanceof TrackingNotFoundError)
    throw new TRPCError({ code: "NOT_FOUND", message: error.message });
  if (error instanceof MissingFitnessError)
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  throw error;
}
export const trackingRouter = router({
  get: protectedProcedure
    .input(trackingGetInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getTrackingSummary(ctx.user.id, input.timeZone);
      } catch (error) {
        return rethrowTrackingError(error);
      }
    }),
  logMeal: protectedProcedure
    .input(logMealInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await logMeal(ctx.user.id, input);
      } catch (error) {
        return rethrowTrackingError(error);
      }
    }),
  updateMeal: protectedProcedure
    .input(updateMealInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateMeal(ctx.user.id, input);
      } catch (error) {
        return rethrowTrackingError(error);
      }
    }),
  deleteMeal: protectedProcedure
    .input(deleteMealInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteMeal(ctx.user.id, input.id);
      } catch (error) {
        return rethrowTrackingError(error);
      }
    }),
  startWorkout: protectedProcedure
    .input(startWorkoutInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await startWorkout(ctx.user.id, input);
      } catch (error) {
        return rethrowTrackingError(error);
      }
    }),
  completeWorkout: protectedProcedure
    .input(completeWorkoutInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await completeWorkout(ctx.user.id, input.id);
      } catch (error) {
        return rethrowTrackingError(error);
      }
    }),
  logWeight: protectedProcedure
    .input(logWeightInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await logWeight(ctx.user.id, input);
      } catch (error) {
        return rethrowTrackingError(error);
      }
    }),
});
