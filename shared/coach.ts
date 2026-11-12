import { z } from "zod";

export const coachRoleSchema = z.enum(["user", "assistant"]);
export const coachMessageSchema = z.object({
  id: z.number().int().positive(),
  role: coachRoleSchema,
  content: z.string().min(1).max(12000),
  createdAt: z.string(),
});
export const coachHistoryInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict()
  .optional();
export const coachSendInputSchema = z
  .object({
    message: z.string().trim().min(1, "Ask a question first").max(2000),
  })
  .strict();
export type CoachMessage = z.infer<typeof coachMessageSchema>;
export type CoachContext = {
  profile: string;
  nutrition: string;
  workouts: string;
};
