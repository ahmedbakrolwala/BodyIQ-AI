import { z } from "zod";

export const profileGoalSchema = z.enum([
  "get_fitter",
  "build_strength",
  "improve_endurance",
]);
export const profileUnitsSchema = z.enum(["metric", "imperial"]);

/**
 * Client-writable profile fields. This schema is strict so userId can never be
 * smuggled into a profile mutation and ownership always comes from ctx.user.id.
 */
export const profileSaveInputSchema = z
  .object({
    displayName: z.string().trim().min(1, "displayName is required").max(60),
    goal: profileGoalSchema,
    country: z
      .string()
      .trim()
      .length(2, "country must be an ISO 3166-1 alpha-2 code")
      .regex(/^[A-Za-z]{2}$/, "country must contain only letters")
      .transform((value) => value.toUpperCase())
      .default("IN"),
    units: profileUnitsSchema.default("metric"),
  })
  .strict();

/** An empty, strict input prevents profile.get from accepting a client userId. */
export const profileGetInputSchema = z.object({}).strict().optional();

export type ProfileSaveInput = z.infer<typeof profileSaveInputSchema>;
export type ProfileGoal = z.infer<typeof profileGoalSchema>;
export type ProfileUnits = z.infer<typeof profileUnitsSchema>;
