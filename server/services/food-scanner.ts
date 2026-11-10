import { randomUUID } from "node:crypto";
import {
  FOOD_SCANNER_ALLOWED_MIME_TYPES,
  FOOD_SCANNER_MAX_RAW_BYTES,
  foodScannerInputSchema,
  foodScannerOutputSchema,
  type FoodScannerInput,
  type FoodScannerOutput,
} from "../../shared/food-scanner";
import { invokeLLM, listLLMModels, type InvokeResult } from "../_core/llm";
import { storageGetSignedUrl, storagePut } from "../storage";

const configuredModel = process.env.FOOD_SCANNER_MODEL?.trim();

const foodScannerJsonSchema = {
  name: "food_scan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "status",
      "likelyItems",
      "servingEstimate",
      "nutrition",
      "confidence",
      "note",
    ],
    properties: {
      status: { type: "string", enum: ["clear", "unclear"] },
      likelyItems: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "confidence", "ingredients"],
          properties: {
            name: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            ingredients: { type: "array", items: { type: "string" } },
          },
        },
      },
      servingEstimate: { type: ["string", "null"] },
      nutrition: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["calories", "proteinG", "carbsG", "fatG"],
            properties: {
              calories: { type: "number", minimum: 0 },
              proteinG: { type: "number", minimum: 0 },
              carbsG: { type: "number", minimum: 0 },
              fatG: { type: "number", minimum: 0 },
            },
          },
          { type: "null" },
        ],
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      note: { type: "string" },
    },
  },
} as const;

const SYSTEM_PROMPT = `You are a cautious food-image estimation assistant. Analyze Indian and international food photos. Identify only items that are reasonably visible, and list likely ingredients when useful. Estimate the visible serving size and calories, protein, carbohydrates, and fat for that serving. These are approximate nutrition estimates, not medical advice or certainty.

If the image is blurry, empty, not food, too obstructed, or otherwise cannot support a responsible identification, return status "unclear", an empty likelyItems array, nutrition null, and explain why in note. Never guess a food or fabricate nutrition for an unclear image. For a clear image, return status "clear", at least one likely item, and bounded approximate nutrition. Do not diagnose allergies, disease, or medical conditions.`;

export class FoodScannerInputError extends Error {
  readonly code = "BAD_REQUEST" as const;
}

export class FoodScannerOutputError extends Error {
  readonly code = "BAD_GATEWAY" as const;
}

function decodeImage(input: FoodScannerInput): Buffer {
  if (
    !(FOOD_SCANNER_ALLOWED_MIME_TYPES as readonly string[]).includes(
      input.mimeType,
    )
  ) {
    throw new FoodScannerInputError("Unsupported image type");
  }
  const compact = input.imageBase64.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 !== 0) {
    throw new FoodScannerInputError("imageBase64 must be valid base64");
  }
  const bytes = Buffer.from(compact, "base64");
  if (bytes.length === 0 || bytes.length > FOOD_SCANNER_MAX_RAW_BYTES) {
    throw new FoodScannerInputError("Image exceeds the 5 MB limit or is empty");
  }
  return bytes;
}

function responseText(result: InvokeResult): string {
  const content = result.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter(
        (part): part is { type: "text"; text: string } => part.type === "text",
      )
      .map((part) => part.text)
      .join("\n")
      .trim();
  }
  return "";
}

function parseJson(text: string): unknown {
  if (!text)
    throw new FoodScannerOutputError("Food scanner returned no output");
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
    if (!fenced)
      throw new FoodScannerOutputError("Food scanner returned invalid JSON");
    try {
      return JSON.parse(fenced);
    } catch {
      throw new FoodScannerOutputError("Food scanner returned invalid JSON");
    }
  }
}

async function supportedConfiguredModel(): Promise<string | undefined> {
  if (!configuredModel) return undefined;
  try {
    const catalog = await listLLMModels();
    return catalog.data.some((model) => model.id === configuredModel)
      ? configuredModel
      : undefined;
  } catch {
    // Catalog discovery is optional. The Forge default remains the safest
    // supported fallback when the configured model cannot be verified.
    return undefined;
  }
}

export async function analyzeFoodImage(
  userId: number,
  rawInput: FoodScannerInput,
): Promise<FoodScannerOutput> {
  const input = foodScannerInputSchema.parse(rawInput);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new FoodScannerInputError("Authenticated user is required");
  }
  const bytes = decodeImage(input);
  const key = `users/${userId}/food-scans/${randomUUID()}.${input.mimeType.split("/")[1]}`;
  await storagePut(key, bytes, input.mimeType);
  const signedUrl = await storageGetSignedUrl(key);
  const model = await supportedConfiguredModel();
  const result = await invokeLLM({
    ...(model ? { model } : {}),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this food photo and return only the requested JSON.",
          },
          { type: "image_url", image_url: { url: signedUrl, detail: "high" } },
        ],
      },
    ],
    maxTokens: 900,
    responseFormat: { type: "json_schema", json_schema: foodScannerJsonSchema },
  });
  const parsed = foodScannerOutputSchema.safeParse(
    parseJson(responseText(result)),
  );
  if (!parsed.success) {
    throw new FoodScannerOutputError("Food scanner returned an invalid result");
  }
  return parsed.data;
}
