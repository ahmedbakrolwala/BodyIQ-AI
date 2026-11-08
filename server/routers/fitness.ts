import {
  fitnessGetInputSchema,
  fitnessSaveInputSchema,
} from "../../shared/fitness";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getFitnessPlanByUserId,
  upsertFitnessProfile,
} from "../repositories/fitness";

export const fitnessRouter = router({
  get: protectedProcedure.input(fitnessGetInputSchema).query(({ ctx }) => {
    return getFitnessPlanByUserId(ctx.user.id);
  }),

  save: protectedProcedure
    .input(fitnessSaveInputSchema)
    .mutation(({ ctx, input }) => {
      return upsertFitnessProfile(ctx.user.id, input);
    }),
});
