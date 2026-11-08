import { router, protectedProcedure } from "../_core/trpc";
import {
  profileGetInputSchema,
  profileSaveInputSchema,
} from "../../shared/profile";
import { getProfileByUserId, upsertProfile } from "../repositories/profile";

export const profileRouter = router({
  get: protectedProcedure.input(profileGetInputSchema).query(({ ctx }) => {
    return getProfileByUserId(ctx.user.id);
  }),

  save: protectedProcedure
    .input(profileSaveInputSchema)
    .mutation(({ ctx, input }) => {
      return upsertProfile(ctx.user.id, input);
    }),
});
