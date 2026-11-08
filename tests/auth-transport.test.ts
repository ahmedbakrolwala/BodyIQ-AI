import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("../constants/oauth", () => ({
  getApiBaseUrl: () => "https://api.example.test",
}));
vi.mock("../lib/_core/auth", () => ({ getSessionToken: vi.fn() }));
import { ApiError, getMe } from "../lib/_core/api";

afterEach(() => vi.unstubAllGlobals());
describe("auth transport distinction", () => {
  it("returns signed-out state only for 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: "Not authenticated" }), {
            status: 401,
          }),
        ),
    );
    expect(await getMe()).toBeNull();
  });
  it("propagates server errors instead of a fake logout", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: "Service unavailable" }), {
            status: 503,
          }),
        ),
    );
    await expect(getMe()).rejects.toBeInstanceOf(ApiError);
  });
  it("propagates network failures for retry UI", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network unavailable")),
    );
    await expect(getMe()).rejects.toThrow("Network unavailable");
  });
});
