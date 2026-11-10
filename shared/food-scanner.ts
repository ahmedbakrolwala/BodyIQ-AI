import { z } from "zod";

export const FOOD_SCANNER_MAX_RAW_BYTES = 5 * 1024 * 1024;
export const FOOD_SCANNER_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const foodScannerMimeTypeSchema = z.enum(
  FOOD_SCANNER_ALLOWED_MIME_TYPES,
);

export const foodScannerInputSchema = z
  .object({
    imageBase64: z
      .string()
      .min(1, "imageBase64 is required")
      .max(7_000_000, "imageBase64 is too large"),
    mimeType: foodScannerMimeTypeSchema,
  })
  .strict();

export const foodScannerStatusSchema = z.enum(["clear", "unclear"]);

const foodScannerNutritionSchema = z
  .object({
    calories: z.number().finite().min(0).max(10_000),
    proteinG: z.number().finite().min(0).max(1_000),
    carbsG: z.number().finite().min(0).max(1_000),
    fatG: z.number().finite().min(0).max(1_000),
  })
  .strict();

const foodScannerItemSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    confidence: z.number().finite().min(0).max(1),
    ingredients: z.array(z.string().trim().min(1).max(120)).max(30),
  })
  .strict();

export const foodScannerOutputSchema = z
  .object({
    status: foodScannerStatusSchema,
    likelyItems: z.array(foodScannerItemSchema).max(20),
    servingEstimate: z.string().trim().max(300).nullable(),
    nutrition: foodScannerNutritionSchema.nullable(),
    confidence: z.number().finite().min(0).max(1),
    note: z.string().trim().max(500),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "unclear") {
      if (value.likelyItems.length > 0 || value.nutrition !== null) {
        context.addIssue({
          code: "custom",
          message:
            "Unclear scans must not contain fabricated items or nutrition",
          path: ["status"],
        });
      }
    } else if (value.likelyItems.length === 0 || value.nutrition === null) {
      context.addIssue({
        code: "custom",
        message:
          "Clear scans require at least one item and nutrition estimates",
        path: ["status"],
      });
    }
  });

export type FoodScannerInput = z.infer<typeof foodScannerInputSchema>;
export type FoodScannerNutrition = z.infer<typeof foodScannerNutritionSchema>;
export type FoodScannerItem = z.infer<typeof foodScannerItemSchema>;
export type FoodScannerOutput = z.infer<typeof foodScannerOutputSchema>;
export type FoodScannerStatus = z.infer<typeof foodScannerStatusSchema>;
