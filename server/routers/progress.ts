import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  progressIdSchema,
  progressInputSchema,
  progressListSchema,
} from "../../shared/progress";
import { create, list, remove, update } from "../repositories/progress";
export const progressRouter = router({
  summary: protectedProcedure
    .input(progressListSchema)
    .query(({ ctx, input }) =>
      list(ctx.user.id, input?.period ?? "all", input?.limit ?? 100),
    ),
  create: protectedProcedure
    .input(progressInputSchema)
    .mutation(({ ctx, input }) => create(ctx.user.id, input)),
  update: protectedProcedure
    .input(progressIdSchema.extend(progressInputSchema.shape))
    .mutation(({ ctx, input }) => update(ctx.user.id, input.id, input)),
  delete: protectedProcedure
    .input(progressIdSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await remove(ctx.user.id, input.id);
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Progress record not found",
        });
      }
    }),
});
