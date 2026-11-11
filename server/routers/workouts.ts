import { protectedProcedure, router } from "../_core/trpc";
import {
  generatePlan,
  getPlan,
  startSession,
  logSet,
  replaceExercise,
  skipExercise,
  completeSession,
  history,
  records,
} from "../repositories/workouts";
import {
  generateWorkoutPlanInputSchema,
  getWorkoutPlanInputSchema,
  startWorkoutSessionInputSchema,
  logWorkoutSetInputSchema,
  replaceWorkoutExerciseInputSchema,
  skipWorkoutExerciseInputSchema,
  sessionIdInputSchema,
  workoutHistoryInputSchema,
} from "../../shared/workouts";

export const workoutsRouter = router({
  generatePlan: protectedProcedure
    .input(generateWorkoutPlanInputSchema)
    .mutation(({ ctx, input }) => generatePlan(ctx.user.id, input)),
  getPlan: protectedProcedure
    .input(getWorkoutPlanInputSchema)
    .query(({ ctx, input }) => getPlan(ctx.user.id, input.planId)),
  startSession: protectedProcedure
    .input(startWorkoutSessionInputSchema)
    .mutation(({ ctx, input }) =>
      startSession(ctx.user.id, input.planId, input.clientId),
    ),
  logSet: protectedProcedure
    .input(logWorkoutSetInputSchema)
    .mutation(({ ctx, input }) => logSet(ctx.user.id, input)),
  replaceExercise: protectedProcedure
    .input(replaceWorkoutExerciseInputSchema)
    .mutation(({ ctx, input }) =>
      replaceExercise(
        ctx.user.id,
        input.sessionId,
        input.exerciseId,
        input.replacementExerciseId,
      ),
    ),
  skipExercise: protectedProcedure
    .input(skipWorkoutExerciseInputSchema)
    .mutation(({ ctx, input }) =>
      skipExercise(ctx.user.id, input.sessionId, input.exerciseId),
    ),
  completeSession: protectedProcedure
    .input(sessionIdInputSchema)
    .mutation(({ ctx, input }) =>
      completeSession(ctx.user.id, input.sessionId),
    ),
  history: protectedProcedure
    .input(workoutHistoryInputSchema)
    .query(({ ctx, input }) => history(ctx.user.id, input?.limit ?? 20)),
  personalRecords: protectedProcedure.query(({ ctx }) => records(ctx.user.id)),
});
