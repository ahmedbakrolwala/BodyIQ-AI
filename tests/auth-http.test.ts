import { randomBytes } from "node:crypto";
import type { Server } from "node:http";
import express, { type Express } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../drizzle/schema";
import { registerAuthRoutes } from "../server/auth/routes";
import type { AuthAdapters, AuthStore } from "../server/auth/types";
import { hashToken } from "../server/auth/service";
import {
  makeMemoryAuthAdapters,
  MemoryAuthStore,
  type SentAuthEmail,
} from "./helpers/auth-fixture";

vi.setConfig({ testTimeout: 60_000 });

const TEST_ISSUER = "bodyiq-auth-test";
const TEST_KEY = new TextEncoder().encode(
  randomBytes(32).toString("base64url"),
);

type SessionClaims = { openId: string; sid?: string; userId?: number };
type SessionTransport = {
  issue(userId: number, user: User, sid: string): Promise<string>;
  verify(token: string): Promise<SessionClaims | null>;
  legacyUser(req: import("express").Request): Promise<User>;
};

type HttpResult = {
  status: number;
  body: Record<string, unknown>;
  headers: Headers;
};

const transport: SessionTransport = {
  async issue(userId, user, sid) {
    return new SignJWT({ openId: user.openId, sid, userId })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(TEST_ISSUER)
      .setExpirationTime("30d")
      .sign(TEST_KEY);
  },
  async verify(token) {
    try {
      const { payload } = await jwtVerify(token, TEST_KEY, {
        algorithms: ["HS256"],
        issuer: TEST_ISSUER,
      });
      if (typeof payload.openId !== "string") return null;
      if (payload.sid !== undefined && typeof payload.sid !== "string")
        return null;
      const userId = payload.userId;
      if (
        userId !== undefined &&
        (typeof userId !== "number" || !Number.isInteger(userId) || userId <= 0)
      )
        return null;
      return {
        openId: payload.openId,
        ...(typeof payload.sid === "string" ? { sid: payload.sid } : {}),
        ...(typeof userId === "number" ? { userId } : {}),
      };
    } catch {
      return null;
    }
  },
  async legacyUser() {
    throw new Error("legacy auth is not used by this test transport");
  },
};

let servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
  servers = [];
});

function makeApp(
  store: MemoryAuthStore,
  sent: SentAuthEmail[],
  options: { emailConfigured?: boolean } = {},
) {
  const app = express();
  app.use(express.json({ limit: "32kb" }));
  const adapters = makeMemoryAuthAdapters(sent, options);
  const register = registerAuthRoutes as unknown as (
    app: Express,
    adapters: AuthAdapters,
    store: AuthStore,
    transport: SessionTransport,
  ) => void;
  register(app, adapters, store, transport);
  return app;
}

async function start(app: Express): Promise<string> {
  const server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("ephemeral server did not expose a port");
  return `http://127.0.0.1:${address.port}`;
}

async function request(
  base: string,
  path: string,
  init: RequestInit = {},
): Promise<HttpResult> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status, body, headers: response.headers };
}

function json(
  method: string,
  body: unknown,
  headers: Record<string, string> = {},
): RequestInit {
  return { method, body: JSON.stringify(body), headers };
}

function expectFailure(result: HttpResult, status: number, code: string) {
  expect(result.status).toBe(status);
  expect(result.body).toEqual({ error: expect.any(String), code });
  expect(result.body.error).not.toBe(code);
}

function cookieFrom(result: HttpResult): string {
  const header = result.headers.get("set-cookie");
  if (!header) throw new Error("auth response did not set a cookie");
  return header.split(";", 1)[0]!;
}

function tokenFor(
  sent: SentAuthEmail[],
  purpose: SentAuthEmail["purpose"],
): string {
  const item = [...sent].reverse().find((email) => email.purpose === purpose);
  if (!item) throw new Error(`missing ${purpose} email`);
  return item.token;
}

describe("HTTP auth lifecycle and session transport", () => {
  it("supports verification, native JWTs, web cookies, restart persistence, logout, and password reset", async () => {
    const store = new MemoryAuthStore();
    const sent: SentAuthEmail[] = [];
    const base = await start(makeApp(store, sent));

    expectFailure(
      await request(
        base,
        "/api/auth/register",
        json("POST", {
          name: "Alice Example",
          email: "alice@example.com",
          password: "correct horse battery",
          userId: 999,
        }),
      ),
      400,
      "invalid_request",
    );

    expect(
      (
        await request(
          base,
          "/api/auth/register",
          json("POST", {
            name: "Alice Example",
            email: "alice@example.com",
            password: "correct horse battery",
          }),
        )
      ).status,
    ).toBe(202);
    expectFailure(
      await request(
        base,
        "/api/auth/login",
        json(
          "POST",
          {
            email: "alice@example.com",
            password: "correct horse battery",
          },
          { "x-bodyiq-platform": "native" },
        ),
      ),
      403,
      "email_unverified",
    );

    expect(
      (
        await request(
          base,
          "/api/auth/verify-email",
          json("POST", { token: tokenFor(sent, "verify") }),
        )
      ).status,
    ).toBe(200);
    const nativeLogin = await request(
      base,
      "/api/auth/login",
      json(
        "POST",
        {
          email: "alice@example.com",
          password: "correct horse battery",
        },
        { "x-bodyiq-platform": "native" },
      ),
    );
    expect(nativeLogin.status).toBe(200);
    const nativeToken = String(nativeLogin.body.sessionToken);
    expect(nativeToken.split(".")).toHaveLength(3);

    const webLogin = await request(
      base,
      "/api/auth/login",
      json("POST", {
        email: "alice@example.com",
        password: "correct horse battery",
      }),
    );
    const cookie = cookieFrom(webLogin);
    const webMe = await request(base, "/api/auth/me", {
      headers: { cookie, origin: "https://app.example.test" },
    });
    expect(webMe.status).toBe(200);
    expect(webMe.body.user).toMatchObject({
      email: "alice@example.com",
      emailVerified: true,
    });

    // A fresh route/service instance can still authenticate the persisted SID.
    const restartedBase = await start(makeApp(store, sent));
    const restartedMe = await request(restartedBase, "/api/auth/me", {
      headers: { authorization: `Bearer ${nativeToken}` },
    });
    expect(restartedMe.status).toBe(200);
    expect(restartedMe.body.user).toMatchObject({ email: "alice@example.com" });

    const logout = await request(restartedBase, "/api/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${nativeToken}` },
    });
    expect(logout.body).toEqual({ success: true });
    expectFailure(
      await request(restartedBase, "/api/auth/me", {
        headers: { authorization: `Bearer ${nativeToken}` },
      }),
      401,
      "not_authenticated",
    );

    const activeLogin = await request(
      restartedBase,
      "/api/auth/login",
      json(
        "POST",
        {
          email: "alice@example.com",
          password: "correct horse battery",
        },
        { "x-bodyiq-platform": "native" },
      ),
    );
    const oldPasswordToken = String(activeLogin.body.sessionToken);
    expect(
      (
        await request(
          restartedBase,
          "/api/auth/forgot-password",
          json("POST", { email: "alice@example.com" }),
        )
      ).status,
    ).toBe(200);
    const resetToken = tokenFor(sent, "reset");
    expect(
      (
        await request(
          restartedBase,
          "/api/auth/reset-password",
          json("POST", { token: resetToken, password: "new correct password" }),
        )
      ).status,
    ).toBe(200);
    expectFailure(
      await request(restartedBase, "/api/auth/me", {
        headers: { authorization: `Bearer ${oldPasswordToken}` },
      }),
      401,
      "not_authenticated",
    );
    expectFailure(
      await request(
        restartedBase,
        "/api/auth/login",
        json("POST", {
          email: "alice@example.com",
          password: "correct horse battery",
        }),
      ),
      401,
      "invalid_credentials",
    );
    expect(
      (
        await request(
          restartedBase,
          "/api/auth/login",
          json("POST", {
            email: "alice@example.com",
            password: "new correct password",
          }),
        )
      ).status,
    ).toBe(200);
    expectFailure(
      await request(
        restartedBase,
        "/api/auth/reset-password",
        json("POST", {
          token: resetToken,
          password: "another correct password",
        }),
      ),
      400,
      "invalid_token",
    );
  }, 60_000);

  it("rejects expired, tampered, wrong-issuer, and owner-mismatched JWTs", async () => {
    const store = new MemoryAuthStore();
    const sent: SentAuthEmail[] = [];
    const base = await start(makeApp(store, sent));
    for (const [name, email, password] of [
      ["Alice Example", "alice@example.com", "correct horse battery"],
      ["Bob Example", "bob@example.com", "another correct password"],
    ] as const) {
      await request(
        base,
        "/api/auth/register",
        json("POST", { name, email, password }),
      );
      await request(
        base,
        "/api/auth/verify-email",
        json("POST", { token: tokenFor(sent, "verify") }),
      );
    }
    const aliceLogin = await request(
      base,
      "/api/auth/login",
      json(
        "POST",
        { email: "alice@example.com", password: "correct horse battery" },
        { "x-bodyiq-platform": "native" },
      ),
    );
    const bobLogin = await request(
      base,
      "/api/auth/login",
      json(
        "POST",
        { email: "bob@example.com", password: "another correct password" },
        { "x-bodyiq-platform": "native" },
      ),
    );
    const aliceClaims = await transport.verify(
      String(aliceLogin.body.sessionToken),
    );
    const bobClaims = await transport.verify(
      String(bobLogin.body.sessionToken),
    );
    expect(aliceClaims?.sid).toBeTruthy();
    expect(bobClaims?.sid).toBeTruthy();

    const tampered = `${String(aliceLogin.body.sessionToken).slice(0, -1)}x`;
    expectFailure(
      await request(base, "/api/auth/me", {
        headers: { authorization: `Bearer ${tampered}` },
      }),
      401,
      "not_authenticated",
    );
    const wrongIssuer = await new SignJWT({
      openId: aliceClaims!.openId,
      sid: aliceClaims!.sid,
      userId: aliceClaims!.userId,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("attacker-issuer")
      .setExpirationTime("30d")
      .sign(TEST_KEY);
    expectFailure(
      await request(base, "/api/auth/me", {
        headers: { authorization: `Bearer ${wrongIssuer}` },
      }),
      401,
      "not_authenticated",
    );

    const ownerMismatch = await new SignJWT({
      openId: bobClaims!.openId,
      sid: aliceClaims!.sid,
      userId: bobClaims!.userId,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(TEST_ISSUER)
      .setExpirationTime("30d")
      .sign(TEST_KEY);
    expectFailure(
      await request(base, "/api/auth/me", {
        headers: { authorization: `Bearer ${ownerMismatch}` },
      }),
      401,
      "not_authenticated",
    );

    await request(
      base,
      "/api/auth/forgot-password",
      json("POST", { email: "alice@example.com" }),
    );
    const expiredToken = tokenFor(sent, "reset");
    const expiredRow = store.actions.get(hashToken(expiredToken));
    if (!expiredRow) throw new Error("missing reset token row");
    expiredRow.expiresAt = new Date(0);
    expectFailure(
      await request(
        base,
        "/api/auth/reset-password",
        json("POST", {
          token: expiredToken,
          password: "newer correct password",
        }),
      ),
      400,
      "invalid_token",
    );
  }, 60_000);

  it("requires the owner and password for deletion, preserves other accounts, and reports provider outages", async () => {
    const store = new MemoryAuthStore();
    const sent: SentAuthEmail[] = [];
    const base = await start(makeApp(store, sent));
    await request(
      base,
      "/api/auth/register",
      json("POST", {
        name: "Alice Example",
        email: "alice@example.com",
        password: "correct horse battery",
      }),
    );
    await request(
      base,
      "/api/auth/verify-email",
      json("POST", { token: tokenFor(sent, "verify") }),
    );
    await request(
      base,
      "/api/auth/register",
      json("POST", {
        name: "Bob Example",
        email: "bob@example.com",
        password: "another correct password",
      }),
    );
    await request(
      base,
      "/api/auth/verify-email",
      json("POST", { token: tokenFor(sent, "verify") }),
    );
    const alice = await request(
      base,
      "/api/auth/login",
      json(
        "POST",
        { email: "alice@example.com", password: "correct horse battery" },
        { "x-bodyiq-platform": "native" },
      ),
    );
    const bob = await request(
      base,
      "/api/auth/login",
      json(
        "POST",
        { email: "bob@example.com", password: "another correct password" },
        { "x-bodyiq-platform": "native" },
      ),
    );

    expectFailure(
      await request(
        base,
        "/api/auth/account/delete",
        json(
          "POST",
          {
            confirmation: "DELETE MY ACCOUNT",
            password: "wrong correct password",
          },
          { authorization: `Bearer ${String(alice.body.sessionToken)}` },
        ),
      ),
      401,
      "invalid_credentials",
    );
    expect(store.users.has(2)).toBe(true);
    expect(
      (
        await request(base, "/api/auth/me", {
          headers: { authorization: `Bearer ${String(bob.body.sessionToken)}` },
        })
      ).status,
    ).toBe(200);

    const deleted = await request(
      base,
      "/api/auth/account/delete",
      json(
        "POST",
        {
          confirmation: "DELETE MY ACCOUNT",
          password: "correct horse battery",
        },
        { authorization: `Bearer ${String(alice.body.sessionToken)}` },
      ),
    );
    expect(deleted.body).toEqual({ success: true });
    expect(store.users.has(1)).toBe(false);
    expect(store.users.has(2)).toBe(true);
    expectFailure(
      await request(base, "/api/auth/me", {
        headers: { authorization: `Bearer ${String(alice.body.sessionToken)}` },
      }),
      401,
      "not_authenticated",
    );

    const outageStore = new MemoryAuthStore();
    const outageSent: SentAuthEmail[] = [];
    const outageBase = await start(
      makeApp(outageStore, outageSent, { emailConfigured: false }),
    );
    const providerFailure = await request(outageBase, "/api/auth/google/start");
    expectFailure(providerFailure, 503, "google_unavailable");
    expect(outageStore.users.size).toBe(0);
  }, 60_000);
});
