import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import * as llm from "../server/_core/llm";
import * as storage from "../server/storage";
import {
  analyzeFoodImage,
  FoodScannerInputError,
  FoodScannerOutputError,
} from "../server/services/food-scanner";

vi.mock("../server/storage", () => ({
  storagePut: vi.fn(),
  storageGetSignedUrl: vi.fn(),
}));
vi.mock("../server/_core/llm", () => ({
  invokeLLM: vi.fn(),
  listLLMModels: vi.fn(),
}));

const mockedPut = vi.mocked(storage.storagePut);
const mockedSignedUrl = vi.mocked(storage.storageGetSignedUrl);
const mockedInvoke = vi.mocked(llm.invokeLLM);

const imageBase64 = Buffer.from("fake-image-bytes").toString("base64");
const clearResult = {
  status: "clear" as const,
  likelyItems: [
    { name: "dal rice", confidence: 0.82, ingredients: ["lentils", "rice"] },
  ],
  servingEstimate: "One medium bowl",
  nutrition: { calories: 420, proteinG: 16, carbsG: 68, fatG: 9 },
  confidence: 0.82,
  note: "Approximate estimate; recipe and portion size can vary.",
};
const unclearResult = {
  status: "unclear" as const,
  likelyItems: [],
  servingEstimate: null,
  nutrition: null,
  confidence: 0.12,
  note: "The photo is too blurry to identify food responsibly.",
};
function context(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}
const user = {
  id: 42,
  openId: "scanner-test-user",
  email: "scanner@example.test",
  name: "Scanner User",
  loginMethod: "test",
  role: "user" as const,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  lastSignedIn: new Date("2026-01-01"),
};

describe("food scanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPut.mockResolvedValue({
      key: "stored-key",
      url: "/manus-storage/stored-key",
    });
    mockedSignedUrl.mockResolvedValue("https://signed.example/food.jpg");
  });

  it("uploads privately, sends the signed image to the LLM, and validates a clear estimate", async () => {
    mockedInvoke.mockResolvedValue({
      id: "scan-1",
      created: 1,
      model: "default",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: { role: "assistant", content: JSON.stringify(clearResult) },
        },
      ],
    });
    await expect(
      analyzeFoodImage(user.id, { imageBase64, mimeType: "image/jpeg" }),
    ).resolves.toEqual(clearResult);
    expect(mockedPut).toHaveBeenCalledWith(
      expect.stringMatching(/^users\/42\/food-scans\/.*\.jpeg$/),
      expect.any(Buffer),
      "image/jpeg",
    );
    expect(mockedSignedUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^users\/42\/food-scans\//),
    );
    expect(mockedInvoke).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.arrayContaining([
              expect.objectContaining({
                type: "image_url",
                image_url: {
                  url: "https://signed.example/food.jpg",
                  detail: "high",
                },
              }),
            ]),
          }),
        ]),
        responseFormat: expect.objectContaining({ type: "json_schema" }),
      }),
    );
  });

  it("accepts a deliberate unclear response without inventing nutrition", async () => {
    mockedInvoke.mockResolvedValue({
      id: "scan-2",
      created: 1,
      model: "default",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: JSON.stringify(unclearResult),
          },
        },
      ],
    });
    await expect(
      analyzeFoodImage(user.id, { imageBase64, mimeType: "image/png" }),
    ).resolves.toEqual(unclearResult);
  });

  it("rejects invalid, empty, oversized, or unsupported images and invalid model output", async () => {
    await expect(
      analyzeFoodImage(user.id, {
        imageBase64: "not base64",
        mimeType: "image/jpeg",
      }),
    ).rejects.toBeInstanceOf(FoodScannerInputError);
    await expect(
      analyzeFoodImage(user.id, {
        imageBase64: Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64"),
        mimeType: "image/jpeg",
      }),
    ).rejects.toBeInstanceOf(FoodScannerInputError);
    await expect(
      analyzeFoodImage(user.id, {
        imageBase64,
        mimeType: "image/gif" as never,
      }),
    ).rejects.toThrow();
    expect(mockedPut).not.toHaveBeenCalled();
    vi.clearAllMocks();
    mockedInvoke.mockResolvedValue({
      id: "scan-3",
      created: 1,
      model: "default",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: { role: "assistant", content: "{}" },
        },
      ],
    });
    await expect(
      analyzeFoodImage(user.id, { imageBase64, mimeType: "image/webp" }),
    ).rejects.toBeInstanceOf(FoodScannerOutputError);
  });

  it("requires authentication at the protected router boundary", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(
      caller.foodScanner.analyze({ imageBase64, mimeType: "image/jpeg" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
