import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => ({ kind: "google-jwks" })),
  jwtVerify: vi.fn(),
}));

import { jwtVerify } from "jose";
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
} from "../server/auth/password";
import { isEmailDeliveryConfigured, sendAuthEmail } from "../server/auth/mail";
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleCode,
  getFrontendAuthUri,
  getGoogleCallbackUri,
  isGoogleConfigured,
} from "../server/auth/google-provider";

const actionToken = Buffer.alloc(32, 7).toString("base64url");
const verifier = "a".repeat(64);
const challenge = "b".repeat(43);

beforeEach(() => {
  for (const name of [
    "RESEND_API_KEY",
    "AUTH_EMAIL_FROM",
    "AUTH_PUBLIC_FRONTEND_URL",
    "EXPO_WEB_PREVIEW_URL",
    "EXPO_PUBLIC_FRONTEND_URL",
    "AUTH_PUBLIC_API_URL",
    "EXPO_PUBLIC_API_BASE_URL",
    "AUTH_GOOGLE_CLIENT_ID",
    "AUTH_GOOGLE_CLIENT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ]) {
    vi.stubEnv(name, "");
  }
  vi.mocked(jwtVerify).mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("password adapter", () => {
  it("hashes with a fresh salt and verifies only the matching password", async () => {
    const first = await hashPassword("correct horse battery staple");
    const second = await hashPassword("correct horse battery staple");

    expect(first).not.toBe(second);
    expect(await verifyPassword("correct horse battery staple", first)).toBe(
      true,
    );
    expect(await verifyPassword("wrong password", first)).toBe(false);
    expect(await verifyPassword("correct horse battery staple", second)).toBe(
      true,
    );
  });

  it("rejects malformed or altered-cost encodings without deriving them", async () => {
    expect(await verifyPassword("anything", "not-a-scrypt-hash")).toBe(false);
    expect(
      await verifyPassword(
        "anything",
        DUMMY_PASSWORD_HASH.replace("N=131072", "N=268435456"),
      ),
    ).toBe(false);
    expect(await verifyPassword("anything", `${DUMMY_PASSWORD_HASH}x`)).toBe(
      false,
    );
    expect(await verifyPassword("x".repeat(129), DUMMY_PASSWORD_HASH)).toBe(
      false,
    );
    expect(
      await verifyPassword("not the dummy password", DUMMY_PASSWORD_HASH),
    ).toBe(false);
  });
});

describe("email adapter", () => {
  it("reports unavailable and never calls a provider without complete configuration", async () => {
    expect(isEmailDeliveryConfigured()).toBe(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendAuthEmail({
        to: "person@example.test",
        purpose: "verify",
        token: actionToken,
      }),
    ).rejects.toMatchObject({
      name: "AuthEmailConfigurationError",
      code: "email_configuration_unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the configured fixed frontend origin and does not report provider failure as success", async () => {
    vi.stubEnv("RESEND_API_KEY", "resend-test-key");
    vi.stubEnv("AUTH_EMAIL_FROM", "noreply@example.test");
    vi.stubEnv("AUTH_PUBLIC_FRONTEND_URL", "https://app.example.test");
    expect(isEmailDeliveryConfigured()).toBe(true);

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      sendAuthEmail({
        to: "person@example.test",
        purpose: "reset",
        token: actionToken,
      }),
    ).rejects.toMatchObject({
      name: "AuthEmailProviderError",
      code: "email_provider_error",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as {
      html: string;
      text: string;
    };
    expect(body.html).toContain(
      "https://app.example.test/reset-password?token=",
    );
    expect(body.html).not.toContain("http://attacker.example");
    expect(body.text).toContain(
      "https://app.example.test/reset-password?token=",
    );
  });
});

describe("Google provider adapter", () => {
  function configureGoogle(): void {
    vi.stubEnv("AUTH_GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("AUTH_GOOGLE_CLIENT_SECRET", "google-client-secret");
    vi.stubEnv("AUTH_PUBLIC_API_URL", "https://api.example.test/ignored-path");
    vi.stubEnv(
      "AUTH_PUBLIC_FRONTEND_URL",
      "https://app.example.test/ignored-path",
    );
  }

  it("reports missing configuration and rejects arbitrary frontend hosts/routes", () => {
    expect(isGoogleConfigured()).toBe(false);
    expect(() => getGoogleCallbackUri()).toThrowError(
      "Google OAuth is not configured",
    );

    configureGoogle();
    expect(isGoogleConfigured()).toBe(true);
    expect(getGoogleCallbackUri()).toBe(
      "https://api.example.test/api/auth/google/callback",
    );
    expect(getFrontendAuthUri("/oauth/callback")).toBe(
      "https://app.example.test/oauth/callback",
    );
    expect(getFrontendAuthUri("/auth/google-callback")).toBe(
      "https://app.example.test/auth/google-callback",
    );
    expect(() =>
      getFrontendAuthUri("https://attacker.example/steal"),
    ).toThrow();
    expect(() => getFrontendAuthUri("/arbitrary")).toThrow();
  });

  it("builds authorization URLs with the fixed callback, S256 PKCE, state, and nonce", () => {
    configureGoogle();
    const parsed = new URL(
      buildGoogleAuthorizationUrl({
        state: "state-value",
        nonce: "nonce-value",
        codeChallenge: challenge,
      }),
    );

    expect(parsed.origin + parsed.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(parsed.searchParams.get("client_id")).toBe("google-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://api.example.test/api/auth/google/callback",
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe("openid email profile");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("code_challenge")).toBe(challenge);
    expect(parsed.searchParams.get("state")).toBe("state-value");
    expect(parsed.searchParams.get("nonce")).toBe("nonce-value");
    expect(parsed.searchParams.get("prompt")).toBe("select_account");
  });

  it("exchanges only an OIDC token with valid signature claims and nonce", async () => {
    configureGoogle();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id_token: "opaque-test-id-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        sub: "google-subject",
        email: "person@example.test",
        email_verified: true,
        name: "Person",
        nonce: "nonce-value",
        exp: Math.floor(Date.now() / 1000) + 300,
      },
      protectedHeader: { alg: "RS256" },
    } as never);

    await expect(
      exchangeGoogleCode({
        code: "authorization-code",
        codeVerifier: verifier,
        nonce: "nonce-value",
      }),
    ).resolves.toEqual({
      subject: "google-subject",
      email: "person@example.test",
      name: "Person",
    });
    expect(vi.mocked(jwtVerify)).toHaveBeenCalledWith(
      "opaque-test-id-token",
      expect.anything(),
      expect.objectContaining({
        algorithms: ["RS256"],
        issuer: "https://accounts.google.com",
        audience: "google-client-id",
      }),
    );
  });

  it("rejects an unverified email or nonce mismatch", async () => {
    configureGoogle();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id_token: "opaque-test-id-token" }), {
          status: 200,
        }),
      ),
    );
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        sub: "google-subject",
        email: "person@example.test",
        email_verified: false,
        nonce: "different-nonce",
        exp: Math.floor(Date.now() / 1000) + 300,
      },
      protectedHeader: { alg: "RS256" },
    } as never);

    await expect(
      exchangeGoogleCode({
        code: "authorization-code",
        codeVerifier: verifier,
        nonce: "nonce-value",
      }),
    ).rejects.toMatchObject({
      name: "GoogleProviderError",
      code: "google_provider_error",
    });
  });
});
