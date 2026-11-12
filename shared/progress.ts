import { z } from "zod";

const measurement = z.number().finite().min(1).max(500).nullable();
const photo = z
  .object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    imageBase64: z.string().max(7_000_000),
  })
  .strict();
export const progressInputSchema = z
  .object({
    recordedAt: z.string().datetime().optional(),
    weightKg: measurement,
    waistCm: measurement,
    chestCm: measurement,
    armCm: measurement,
    thighCm: measurement,
    note: z.string().trim().max(240).optional().default(""),
    photo: photo.optional(),
  })
  .strict()
  .refine(
    (v) =>
      [v.weightKg, v.waistCm, v.chestCm, v.armCm, v.thighCm].some(
        (x) => x !== null,
      ) || v.photo !== undefined,
    { message: "Record at least one measurement or a photo" },
  );
export const progressIdSchema = z
  .object({ id: z.number().int().positive() })
  .strict();
export const progressListSchema = z
  .object({
    period: z.enum(["week", "month", "all"]).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict()
  .optional();
export type ProgressInput = z.infer<typeof progressInputSchema>;
export type ProgressRecord = {
  id: number;
  recordedAt: string;
  weightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  note: string;
  photoUrl: string | null;
};
export type ProgressSummary = {
  records: ProgressRecord[];
  charts: {
    weight: Array<{ date: string; value: number }>;
    waist: Array<{ date: string; value: number }>;
    chest: Array<{ date: string; value: number }>;
    arm: Array<{ date: string; value: number }>;
    thigh: Array<{ date: string; value: number }>;
  };
  weekly: { workouts: number; goalCompletion: number | null };
  monthly: { workouts: number; goalCompletion: number | null };
  strength: { bestWeightKg: number | null; records: number };
  milestones: string[];
};
