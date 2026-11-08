import { randomBytes, createHash } from "node:crypto";
import express from "express";
import type { Server } from "node:http";
import { SignJWT, jwtVerify } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_SCHEME } from "../shared/app-identity";
import {
  decryptGoogleState,
  encryptGoogleState,
  GOOGLE_BINDING_COOKIE,
  isAllowedGoogleNativeReturn,
} from "../server/auth/google-state";
import {
  registerAuthRoutes,
  type SessionTransport,
} from "../server/auth/routes";
import {
  MemoryAuthStore,
  makeMemoryAuthAdapters,
} from "./helpers/auth-fixture";
const key = randomBytes(32);
let server: Server | undefined;
afterEach(async () => {
  if (server)
    await new Promise<void>((r) => {
      server!.close(() => r());
      server!.closeAllConnections();
    });
  server = undefined;
  vi.unstubAllEnvs();
});
describe("Google state and verifier binding", () => {
  it("authenticates encrypted state and does not expose PKCE secrets", () => {
    vi.stubEnv("MANUS_JWT_SECRET", randomBytes(32).toString("base64url"));
    const doc = {
      nonce: "test-nonce",
      binding: "browser-binding",
      verifier: "private-pkce-verifier",
      kind: "web" as const,
      redirectUri: null,
      expiresAt: Date.now() + 60000,
    };
    const state = encryptGoogleState(doc);
    expect(state).not.toContain(doc.verifier);
    expect(decryptGoogleState(state)).toEqual(doc);
    const parts = state.split(".");
    parts[1] = (parts[1][0] === "A" ? "B" : "A") + parts[1].slice(1);
    expect(() => decryptGoogleState(parts.join("."))).toThrow();
  });
  it("accepts only this app or the exact managed Expo host", () => {
    vi.stubEnv("EXPO_PACKAGER_PROXY_URL", "https://8081-managed.example.test");
    expect(
      isAllowedGoogleNativeReturn(`${APP_SCHEME}:///auth/google-callback`),
    ).toBe(true);
    expect(
      isAllowedGoogleNativeReturn(
        "exps://8081-managed.example.test/--/auth/google-callback",
      ),
    ).toBe(true);
    expect(
      isAllowedGoogleNativeReturn(
        "exps://attacker.example.test/--/auth/google-callback",
      ),
    ).toBe(false);
    expect(
      isAllowedGoogleNativeReturn(
        `${APP_SCHEME}:///auth/google-callback?token=bad`,
      ),
    ).toBe(false);
    expect(
      isAllowedGoogleNativeReturn(
        "https://attacker.example.test/auth/google-callback",
      ),
    ).toBe(false);
  });
  it("uses the original PKCE verifier, requires the browser cookie, and issues a revocable JWT", async () => {
    vi.stubEnv("MANUS_JWT_SECRET", randomBytes(32).toString("base64url"));
    const store = new MemoryAuthStore();
    const adapters = makeMemoryAuthAdapters([], { googleConfigured: true });
    let requested:
      | { state: string; nonce: string; codeChallenge: string }
      | undefined;
    let exchanged:
      | { code: string; codeVerifier: string; nonce: string }
      | undefined;
    adapters.buildGoogleAuthorizationUrl = (input) => {
      requested = input;
      return `https://accounts.google.com/o/oauth2/v2/auth?state=${encodeURIComponent(input.state)}`;
    };
    adapters.exchangeGoogleCode = async (input) => {
      exchanged = input;
      return {
        subject: "google-test-subject",
        email: "google@example.test",
        name: "Test coach",
      };
    };
    const transport: SessionTransport = {
      issue: async (userId, user, sid) =>
        new SignJWT({ openId: user.openId, userId, sid })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("30d")
          .sign(key),
      verify: async (token) => {
        try {
          const { payload } = await jwtVerify(token, key, {
            algorithms: ["HS256"],
          });
          return {
            openId: String(payload.openId),
            sid: String(payload.sid),
            userId: Number(payload.userId),
          };
        } catch {
          return null;
        }
      },
      legacyUser: async () => {
        throw new Error("No legacy users in this isolated test");
      },
    };
    const app = express();
    app.use(express.json());
    registerAuthRoutes(app, adapters, store, transport);
    server = await new Promise<Server>((r) => {
      const s = app.listen(0, () => r(s));
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No test listener");
    const base = `http://127.0.0.1:${address.port}`;
    const start = await fetch(`${base}/api/auth/google/start`, {
      redirect: "manual",
    });
    expect(start.status).toBe(302);
    const binding = start.headers.get("set-cookie")!.split(";")[0];
    expect(binding.startsWith(`${GOOGLE_BINDING_COOKIE}=`)).toBe(true);
    const state = requested!.state;
    const document = decryptGoogleState(state);
    expect(requested!.codeChallenge).toBe(
      createHash("sha256").update(document.verifier).digest("base64url"),
    );
    const path = `${base}/api/auth/google/callback?state=${encodeURIComponent(state)}&code=isolated-google-code`;
    const missing = await fetch(path, { redirect: "manual" });
    expect(missing.status).toBe(400);
    expect(exchanged).toBeUndefined();
    const callback = await fetch(path, {
      headers: { Cookie: binding },
      redirect: "manual",
    });
    expect(callback.status).toBe(302);
    expect(exchanged!.codeVerifier).toBe(document.verifier);
    expect(exchanged!.nonce).toBe(document.nonce);
    const cookie = callback.headers
      .get("set-cookie")!
      .match(/webdev_app_session=([^;]+)/)![0];
    const me = await fetch(`${base}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    expect(me.status).toBe(200);
    expect((await me.json()).user.authProvider).toBe("google");
    const replay = await fetch(path, {
      headers: { Cookie: binding },
      redirect: "manual",
    });
    expect(replay.status).toBe(400);
  });
});
