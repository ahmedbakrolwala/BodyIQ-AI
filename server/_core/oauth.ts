import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import { ONE_YEAR_MS } from "../../shared/const.js";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieName, getSessionCookieOptions } from "./cookies";
import {
  createBrowserOAuthState,
  createNativeOAuthState,
  decodeOAuthState,
  getNativeOAuthRedirectUri,
  getOAuthCallbackUri,
  getOAuthNonceCookieOptions,
  isAllowedNativeRedirectUri,
  verifyBrowserOAuthState,
  verifyNativeOAuthState,
  OAUTH_NONCE_COOKIE,
} from "./oauth-state";
import { sdk } from "./sdk";

const APPLICATION_SESSION_COOKIE = "webdev_app_session";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getPortalUrl(): string {
  const value =
    process.env.MANUS_OAUTH_PORTAL_URL ??
    process.env.VITE_OAUTH_PORTAL_URL ??
    process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ??
    "";
  if (!value) throw new Error("Manus OAuth portal is not configured");
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Manus OAuth portal must use HTTP or HTTPS");
  }
  return url.origin;
}

function getFrontendRedirectUri(): string {
  // This is deliberately environment-only. It is never taken from req.query,
  // OAuth state, or a client-provided redirect parameter.
  const value =
    process.env.EXPO_PUBLIC_FRONTEND_URL ??
    process.env.EXPO_PUBLIC_WEB_URL ??
    process.env.EXPO_WEB_PREVIEW_URL ??
    process.env.EXPO_PACKAGER_PROXY_URL ??
    "http://localhost:8081";
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Frontend OAuth redirect must use HTTP or HTTPS");
  }
  url.pathname = "/oauth/callback";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function buildAuthorizationUrl(state: string, redirectUri: string): string {
  const url = new URL("/app-auth", getPortalUrl());
  url.searchParams.set(
    "appId",
    process.env.MANUS_PROJECT_ID ?? process.env.VITE_APP_ID ?? "",
  );
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("responseType", "code");
  url.searchParams.set("type", "signIn");
  return url.toString();
}

function clearOAuthNonce(res: Response, req: Request) {
  const { maxAge: _maxAge, ...clearOptions } = getOAuthNonceCookieOptions(req);
  res.clearCookie(OAUTH_NONCE_COOKIE, clearOptions);
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) throw new Error("openId missing from user info");

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name ?? null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name ?? null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn,
    }
  );
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

function setApplicationSession(res: Response, req: Request, token: string) {
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(APPLICATION_SESSION_COOKIE, token, {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });
}

async function exchangeNativeCode(req: Request, res: Response) {
  const source = req.body ?? {};
  const code = typeof source.code === "string" ? source.code : undefined;
  const state = typeof source.state === "string" ? source.state : undefined;
  const verifier =
    typeof source.verifier === "string" ? source.verifier : undefined;

  if (!code || !state || !verifier) {
    res.status(400).json({ error: "code, state, and verifier are required" });
    return;
  }
  let redirectUri: string;
  try {
    redirectUri = decodeOAuthState(state).redirectUri;
  } catch {
    res.status(400).json({ error: "Invalid OAuth state" });
    return;
  }
  if (
    !isAllowedNativeRedirectUri(redirectUri) ||
    !verifyNativeOAuthState(state, verifier, redirectUri)
  ) {
    res.status(400).json({ error: "Invalid OAuth state" });
    return;
  }

  try {
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
    const user = await syncUser(userInfo);
    const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
      name: userInfo.name ?? "",
      expiresInMs: ONE_YEAR_MS,
    });

    // The native app must validate this signed token through /api/auth/me;
    // returned display data is informational and is not an auth assertion.
    res.json({ sessionToken, user: buildUserResponse(user) });
  } catch {
    console.error("[OAuth] Native exchange failed");
    res.status(500).json({ error: "OAuth exchange failed" });
  }
}

export function registerOAuthRoutes(app: Express) {
  // Browser initiation. The callback origin is fixed by server configuration,
  // and the nonce is bound to an HttpOnly cookie for this browser.
  app.get("/api/oauth/start", (req: Request, res: Response) => {
    try {
      const redirectUri = getOAuthCallbackUri();
      const { state, nonce } = createBrowserOAuthState(redirectUri);
      res.cookie(OAUTH_NONCE_COOKIE, nonce, getOAuthNonceCookieOptions(req));
      res.redirect(302, buildAuthorizationUrl(state, redirectUri));
    } catch {
      res.status(503).json({ error: "OAuth is not configured" });
    }
  });

  // Native initiation returns an authorization URL. The verifier is never
  // persisted server-side; its hash is signed into state for horizontal scale.
  app.post("/api/oauth/start", (req: Request, res: Response) => {
    try {
      const verifier =
        typeof req.body?.verifier === "string" ? req.body.verifier : "";
      const redirectUri =
        typeof req.body?.redirectUri === "string"
          ? req.body.redirectUri
          : getNativeOAuthRedirectUri();
      if (!isAllowedNativeRedirectUri(redirectUri)) {
        res.status(400).json({ error: "Native OAuth redirect is not allowed" });
        return;
      }
      const state = createNativeOAuthState(redirectUri, verifier);
      res.json({ authorizationUrl: buildAuthorizationUrl(state, redirectUri) });
    } catch {
      res.status(400).json({ error: "Unable to start OAuth" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const cookieHeader = req.headers.cookie
      ? parseCookieHeader(req.headers.cookie)
      : {};
    const nonce = cookieHeader[OAUTH_NONCE_COOKIE];
    clearOAuthNonce(res, req);

    let expectedRedirectUri: string;
    try {
      expectedRedirectUri = getOAuthCallbackUri();
    } catch {
      res.status(503).json({ error: "OAuth is not configured" });
      return;
    }
    if (
      !code ||
      !state ||
      !verifyBrowserOAuthState(state, nonce, expectedRedirectUri)
    ) {
      res.status(400).json({ error: "Invalid OAuth callback state" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });
      setApplicationSession(res, req, sessionToken);
      res.redirect(302, getFrontendRedirectUri());
    } catch {
      console.error("[OAuth] Browser callback failed");
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // Native callback exchange. It accepts no sessionToken or user query
  // parameters; both code and verifier must pass the server-side checks.
  app.post("/api/oauth/mobile", exchangeNativeCode);

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(APPLICATION_SESSION_COOKIE, {
      ...cookieOptions,
      maxAge: -1,
    });
    res.clearCookie(getSessionCookieName(req), {
      ...cookieOptions,
      maxAge: -1,
    });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // Preview/runtime compatibility: establish the same fixed application
  // cookie from an already validated Bearer session.
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      setApplicationSession(
        res,
        req,
        authHeader.slice("Bearer ".length).trim(),
      );
      res.json({ success: true, user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
