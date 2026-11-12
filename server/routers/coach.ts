import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  coachHistoryInputSchema,
  coachSendInputSchema,
} from "../../shared/coach";
import { answerCoach } from "../services/coach-ai";
import { buildCoachContext } from "../services/coach-context";
import { appendTurn, history } from "../repositories/coach";

export const coachRouter = router({
  history: protectedProcedure
    .input(coachHistoryInputSchema)
    .query(({ ctx, input }) => history(ctx.user.id, input?.limit ?? 50)),
  send: protectedProcedure
    .input(coachSendInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await history(ctx.user.id, 40);
        const context = await buildCoachContext(ctx.user.id);
        const answer = await answerCoach(
          input.message,
          context,
          existing.map(({ role, content }) => ({ role, content })),
        );
        return {
          messages: await appendTurn(ctx.user.id, input.message, answer),
        };
      } catch (error) {
        console.error(
          "[Coach] request failed",
          error instanceof Error ? error.message : "unknown",
        );
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Coach is temporarily unavailable. Please try again.",
        });
      }
    }),
});
