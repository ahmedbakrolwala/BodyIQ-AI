import { TRPCError } from "@trpc/server";
import { foodScannerInputSchema } from "../../shared/food-scanner";
import { protectedProcedure, router } from "../_core/trpc";
import {
  analyzeFoodImage,
  FoodScannerInputError,
  FoodScannerOutputError,
} from "../services/food-scanner";

export const foodScannerRouter = router({
  analyze: protectedProcedure
    .input(foodScannerInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await analyzeFoodImage(ctx.user.id, input);
      } catch (error) {
        if (error instanceof FoodScannerInputError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }
        if (error instanceof FoodScannerOutputError) {
          throw new TRPCError({ code: "BAD_GATEWAY", message: error.message });
        }
        throw error;
      }
    }),
});
