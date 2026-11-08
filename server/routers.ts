import { getSessionCookieName, getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { isDatabaseReachable } from "./db";
import { profileRouter } from "./routers/profile";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(getSessionCookieName(ctx.req), {
        ...cookieOptions,
        maxAge: -1,
      });
      return {
        success: true,
      } as const;
    }),
  }),
  profile: profileRouter,
  foundation: router({
    status: publicProcedure.query(async () => ({
      service: "BodyIQ AI",
      phase: "Phase 1",
      databaseReachable: await isDatabaseReachable(),
    })),
  }),
});

export type AppRouter = typeof appRouter;
