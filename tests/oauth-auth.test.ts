import { describe, expect, it, vi } from "vitest";
import { sdk } from "../server/_core/sdk";
import {
  createBrowserOAuthState,
  createNativeOAuthState,
  getNativeOAuthRedirectUri,
  isAllowedNativeRedirectUri,
  verifyBrowserOAuthState,
  verifyNativeOAuthState,
} from "../server/_core/oauth-state";

describe("OAuth state binding", () => {
  it("rejects a browser state with the wrong nonce or redirect", () => {
    const { state, nonce } = createBrowserOAuthState(
      "https://api.example.test/api/oauth/callback",
    );

    expect(
      verifyBrowserOAuthState(
        state,
        nonce,
        "https://api.example.test/api/oauth/callback",
      ),
    ).toBe(true);
    expect(
      verifyBrowserOAuthState(
        state,
        "different-nonce",
        "https://api.example.test/api/oauth/callback",
      ),
    ).toBe(false);
    expect(
      verifyBrowserOAuthState(
        state,
        nonce,
        "https://attacker.example/api/oauth/callback",
      ),
    ).toBe(false);
    expect(
      verifyBrowserOAuthState(
        `${state}.tampered`,
        nonce,
        "https://api.example.test/api/oauth/callback",
      ),
    ).toBe(false);
  });

  it("binds native state to the verifier and fixed callback", () => {
    const verifier = "a".repeat(64);
    const redirectUri = getNativeOAuthRedirectUri();
    const state = createNativeOAuthState(redirectUri, verifier);

    expect(verifyNativeOAuthState(state, verifier, redirectUri)).toBe(true);
    expect(verifyNativeOAuthState(state, "b".repeat(64), redirectUri)).toBe(
      false,
    );
    expect(
      verifyNativeOAuthState(state, verifier, "manus259119117241860://other"),
    ).toBe(false);
  });
  it("allows only the configured Expo Go authority and exact callback path", () => {
    vi.stubEnv("EXPO_PACKAGER_PROXY_URL", "https://metro.example.test");
    try {
      expect(
        isAllowedNativeRedirectUri(
          "exps://metro.example.test/--/oauth/callback",
        ),
      ).toBe(true);
      expect(
        isAllowedNativeRedirectUri(
          "exps://attacker.example.test/--/oauth/callback",
        ),
      ).toBe(false);
      expect(
        isAllowedNativeRedirectUri("exps://metro.example.test/--/other"),
      ).toBe(false);
      expect(
        isAllowedNativeRedirectUri(
          "exps://person@metro.example.test/--/oauth/callback",
        ),
      ).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("rejects changing the native redirect even with the original verifier", () => {
    const verifier = "a".repeat(64);
    const state = createNativeOAuthState(getNativeOAuthRedirectUri(), verifier);
    const document = JSON.parse(Buffer.from(state, "base64").toString());
    document.redirectUri = "exps://metro.example.test/--/oauth/callback";
    const changed = Buffer.from(JSON.stringify(document)).toString("base64");
    expect(
      verifyNativeOAuthState(changed, verifier, document.redirectUri),
    ).toBe(false);
  });
});

describe("application session validation", () => {
  it("rejects a session signed for another app and accepts an empty name", async () => {
    const wrongApp = await sdk.signSession({
      openId: "user-1",
      appId: "another-project",
      name: "",
    });
    expect(await sdk.verifySession(wrongApp)).toBeNull();

    const emptyName = await sdk.createSessionToken("user-1", { name: "" });
    const verified = await sdk.verifySession(emptyName);
    // If the host has no configured app id, a valid app session cannot be
    // asserted; the wrong-app assertion above remains deterministic.
    if (process.env.MANUS_PROJECT_ID || process.env.VITE_APP_ID) {
      expect(verified?.name).toBe("");
    } else {
      expect(verified).toBeNull();
    }
  });

  it("does not invent a Preview user without a token", async () => {
    expect(await sdk.verifySession(undefined)).toBeNull();
  });
});
