import type { Express, Request, Response } from "express";
import { createHash } from "node:crypto";
import { parse as parseCookie } from "cookie";
import type { User } from "../../drizzle/schema";
import {
  getSessionCookieOptions,
  APPLICATION_SESSION_COOKIE,
  currentSessionCookie,
  getSessionCookieName,
} from "../_core/cookies";
import { sdk } from "../_core/sdk";
import { authStore } from "./store";
import {
  AuthFailure,
  AuthService,
  hashToken,
  publicUser,
  randomToken,
} from "./service";
import type { AuthAdapters, AuthStore } from "./types";
import {
  GOOGLE_BINDING_COOKIE,
  decryptGoogleState,
  encryptGoogleState,
  isAllowedGoogleNativeReturn,
  secureEqual,
  type GoogleStateDocument,
} from "./google-state";

export type SessionTransport = {
  issue: (userId: number, user: User, sid: string) => Promise<string>;
  verify: (
    token: string,
  ) => Promise<{ openId: string; sid?: string; userId?: number } | null>;
  legacyUser: (req: Request) => Promise<User>;
};
const defaultTransport: SessionTransport = {
  issue: (userId, user, sid) =>
    sdk.createManagedSessionToken(userId, user.openId, sid, {
      name: user.name ?? "",
    }),
  verify: (token) => sdk.verifySession(token),
  legacyUser: (req) => sdk.authenticateRequest(req),
};
const messages: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  invalid_name: "Enter a name of 1–60 characters.",
  invalid_password: "Use a password of 12–128 characters.",
  invalid_credentials: "The email or password is incorrect.",
  email_unverified: "Verify your email before signing in.",
  email_unavailable:
    "Email delivery is not configured or temporarily unavailable. Please try again when the service is ready.",
  google_unavailable: "Google sign-in is not configured yet.",
  google_failed: "Google sign-in did not finish. Please try again.",
  invalid_request: "This request is not valid. Please try again.",
  invalid_token:
    "This link is invalid, expired or already used. Please request a new email.",
  not_authenticated: "Your session has expired. Please sign in again.",
  rate_limited: "Too many attempts. Please wait and try again.",
  origin_required:
    "This request could not be verified. Reopen the app and try again.",
  confirmation_required: "Type DELETE MY ACCOUNT to confirm this action.",
  reauth_required:
    "Sign in again with your original account provider before deleting your account.",
  invalid_oauth_state:
    "This sign-in attempt expired or could not be verified. Please start again.",
  invalid_oauth_callback:
    "Sign-in did not return a valid authorization response.",
  invalid_oauth_request: "This device callback could not be verified.",
  invalid_oauth_code:
    "This sign-in completion code expired or has already been used.",
  invalid_google_identity: "This Google identity could not be verified.",
  auth_unavailable:
    "Authentication is temporarily unavailable. Please retry shortly.",
};
const bodyObject = (body: unknown): Record<string, unknown> =>
  body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
const strict = (body: Record<string, unknown>, keys: string[]) => {
  if (Object.keys(body).some((key) => !keys.includes(key)))
    throw new AuthFailure("invalid_request", 400);
};
const bearer = (req: Request) =>
  typeof req.headers.authorization === "string" &&
  req.headers.authorization.startsWith("Bearer ")
    ? req.headers.authorization.slice(7).trim()
    : undefined;
const tokenFrom = (req: Request) => bearer(req) ?? currentSessionCookie(req);
const protectCookie = (req: Request) => {
  if (!currentSessionCookie(req) || bearer(req)) return;
  if (!req.headers.origin && req.headers["x-bodyiq-client"] !== "bodyiq-app")
    throw new AuthFailure("origin_required", 403);
};
const setCookie = (req: Request, res: Response, token: string) =>
  res.cookie(APPLICATION_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(req),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
const clearCookies = (req: Request, res: Response) => {
  const options = getSessionCookieOptions(req);
  res.clearCookie(APPLICATION_SESSION_COOKIE, { ...options, maxAge: -1 });
  res.clearCookie(getSessionCookieName(req), { ...options, maxAge: -1 });
};
const bindingOptions = (req: Request) => ({
  ...getSessionCookieOptions(req),
  path: "/api/auth/google",
  maxAge: 10 * 60 * 1000,
});
const isNative = (req: Request) =>
  req.headers["x-bodyiq-platform"] === "native";
function sendFailure(res: Response, error: unknown) {
  if (error instanceof AuthFailure)
    return res.status(error.status).json({
      error: messages[error.code] ?? messages.auth_unavailable,
      code: error.code,
    });
  const code = (error as { code?: string })?.code;
  if (code === "google_configuration_unavailable")
    return res
      .status(503)
      .json({ error: messages.google_unavailable, code: "google_unavailable" });
  if (code === "google_provider_error")
    return res
      .status(502)
      .json({ error: messages.google_failed, code: "google_failed" });
  console.error("[Auth] Request failed");
  return res
    .status(503)
    .json({ error: messages.auth_unavailable, code: "auth_unavailable" });
}
export function createAuthService(
  adapters: AuthAdapters,
  store: AuthStore = authStore,
  transport: SessionTransport = defaultTransport,
) {
  return new AuthService(store, adapters, undefined, transport.issue);
}

export function registerAuthRoutes(
  app: Express,
  adapters: AuthAdapters,
  store: AuthStore = authStore,
  transport: SessionTransport = defaultTransport,
) {
  const service = createAuthService(adapters, store, transport);
  app.use("/api/auth", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  const wrap =
    (fn: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response) => {
      void fn(req, res).catch((error) => {
        sendFailure(res, error);
      });
    };
  async function throttle(req: Request, action: string, max = 60) {
    const key = hashToken(
      `http:${action}:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`,
    );
    if (!(await store.consumeRateLimit(key, new Date(), 15 * 60 * 1000, max)))
      throw new AuthFailure("rate_limited", 429);
  }
  async function authenticate(req: Request) {
    const token = tokenFrom(req);
    if (!token) throw new AuthFailure("not_authenticated", 401);
    const claims = await transport.verify(token);
    if (!claims || (await store.hasRevocation(hashToken(`jwt:${token}`))))
      throw new AuthFailure("not_authenticated", 401);
    if (claims.sid) {
      const result = await service.authenticateSession(claims.sid);
      if (
        result.user.id !== claims.userId ||
        result.user.openId !== claims.openId
      )
        throw new AuthFailure("not_authenticated", 401);
      return result;
    }
    if (await store.hasRevocation(hashToken(claims.openId)))
      throw new AuthFailure("not_authenticated", 401);
    const user = await transport.legacyUser(req);
    if (user.openId !== claims.openId)
      throw new AuthFailure("not_authenticated", 401);
    return {
      user,
      credential: undefined,
      authProvider: "manus",
      session: { sidHash: "", reauthenticatedAt: null },
    };
  }
  app.get("/api/auth/capabilities", (_req, res) =>
    res.json({
      google: adapters.isGoogleConfigured(),
      emailPassword: true,
      emailDelivery: adapters.isEmailDeliveryConfigured(),
      accountDeletion: true,
    }),
  );
  app.post(
    "/api/auth/register",
    wrap(async (req, res) => {
      const body = bodyObject(req.body);
      strict(body, ["name", "email", "password"]);
      if (!adapters.isEmailDeliveryConfigured())
        throw new AuthFailure("email_unavailable", 503);
      await throttle(req, "register", 15);
      res.status(202).json(
        await service.register({
          name: body.name,
          email: body.email,
          password: body.password,
        }),
      );
    }),
  );
  app.post(
    "/api/auth/login",
    wrap(async (req, res) => {
      const body = bodyObject(req.body);
      strict(body, ["email", "password"]);
      await throttle(req, "login", 60);
      const result = await service.login({
        email: body.email,
        password: body.password,
      });
      if (isNative(req)) return res.json(result);
      setCookie(req, res, result.sessionToken);
      res.json({ user: result.user });
    }),
  );
  app.post(
    "/api/auth/verify-email",
    wrap(async (req, res) => {
      const body = bodyObject(req.body);
      strict(body, ["token"]);
      await throttle(req, "verify", 60);
      res.json(await service.verifyEmail(body.token));
    }),
  );
  app.post(
    "/api/auth/resend-verification",
    wrap(async (req, res) => {
      const body = bodyObject(req.body);
      strict(body, ["email"]);
      if (!adapters.isEmailDeliveryConfigured())
        throw new AuthFailure("email_unavailable", 503);
      await throttle(req, "resend", 20);
      res.json(await service.resendVerification(body.email));
    }),
  );
  app.post(
    "/api/auth/forgot-password",
    wrap(async (req, res) => {
      const body = bodyObject(req.body);
      strict(body, ["email"]);
      if (!adapters.isEmailDeliveryConfigured())
        throw new AuthFailure("email_unavailable", 503);
      await throttle(req, "forgot", 20);
      res.json(await service.forgotPassword(body.email));
    }),
  );
  app.post(
    "/api/auth/reset-password",
    wrap(async (req, res) => {
      const body = bodyObject(req.body);
      strict(body, ["token", "password"]);
      await throttle(req, "reset", 20);
      res.json(
        await service.resetPassword({
          token: body.token,
          password: body.password,
        }),
      );
    }),
  );
  app.get(
    "/api/auth/me",
    wrap(async (req, res) => {
      const current = await authenticate(req);
      res.json({
        user: {
          ...publicUser(current.user, current.credential),
          emailVerified:
            current.authProvider === "google"
              ? true
              : current.credential
                ? Boolean(current.credential.emailVerifiedAt)
                : undefined,
          authProvider: current.authProvider,
          canDeleteWithPassword: Boolean(current.credential),
          requiresReauthentication:
            !current.session.reauthenticatedAt ||
            Date.now() - current.session.reauthenticatedAt.getTime() >
              10 * 60 * 1000,
        },
      });
    }),
  );
  app.post(
    "/api/auth/logout",
    wrap(async (req, res) => {
      protectCookie(req);
      const token = tokenFrom(req);
      if (token) {
        const claims = await transport.verify(token);
        if (claims?.sid) await service.logout(claims.sid);
        else if (claims) await store.addRevocation(hashToken(`jwt:${token}`));
      }
      clearCookies(req, res);
      res.json({ success: true });
    }),
  );
  app.post(
    "/api/auth/account/delete",
    wrap(async (req, res) => {
      protectCookie(req);
      const body = bodyObject(req.body);
      strict(body, ["confirmation", "password"]);
      if (body.confirmation !== "DELETE MY ACCOUNT")
        throw new AuthFailure("confirmation_required", 400);
      const current = await authenticate(req);
      await throttle(req, "delete", 15);
      await service.deleteAccount({
        userId: current.user.id,
        password: body.password,
        sessionReauthenticatedAt: current.session.reauthenticatedAt,
        sessionSidHash: current.session.sidHash,
      });
      clearCookies(req, res);
      res.json({ success: true });
    }),
  );
  async function startGoogle(
    req: Request,
    res: Response,
    kind: "web" | "native",
  ) {
    if (!adapters.isGoogleConfigured())
      throw new AuthFailure("google_unavailable", 503);
    await throttle(req, "google-start", 60);
    let redirectUri: string | null = null;
    let verifier = randomToken(32);
    if (kind === "native") {
      const body = bodyObject(req.body);
      strict(body, ["redirectUri", "verifier"]);
      if (
        typeof body.redirectUri !== "string" ||
        !isAllowedGoogleNativeReturn(body.redirectUri) ||
        typeof body.verifier !== "string" ||
        !/^[A-Za-z0-9_-]{43,128}$/.test(body.verifier)
      )
        throw new AuthFailure("invalid_oauth_request", 400);
      redirectUri = body.redirectUri;
      verifier = body.verifier;
    }
    const document: GoogleStateDocument = {
      nonce: randomToken(24),
      binding: randomToken(24),
      verifier,
      kind,
      redirectUri,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    const state = encryptGoogleState(document);
    await service.createGoogleState({
      state,
      nonce: document.nonce,
      verifier,
      kind,
      redirectUri,
    });
    if (kind === "web")
      res.cookie(GOOGLE_BINDING_COOKIE, document.binding, bindingOptions(req));
    const authorizationUrl = adapters.buildGoogleAuthorizationUrl({
      state,
      nonce: document.nonce,
      codeChallenge: createHash("sha256").update(verifier).digest("base64url"),
    });
    return kind === "web"
      ? res.redirect(302, authorizationUrl)
      : res.json({ authorizationUrl });
  }
  app.get(
    "/api/auth/google/start",
    wrap((req, res) => startGoogle(req, res, "web")),
  );
  app.post(
    "/api/auth/google/start",
    wrap((req, res) => startGoogle(req, res, "native")),
  );
  app.get(
    "/api/auth/google/callback",
    wrap(async (req, res) => {
      if (!adapters.isGoogleConfigured())
        throw new AuthFailure("google_unavailable", 503);
      const state = typeof req.query.state === "string" ? req.query.state : "";
      let document: GoogleStateDocument;
      try {
        document = decryptGoogleState(state);
      } catch {
        throw new AuthFailure("invalid_oauth_state", 400);
      }
      if (document.kind === "web") {
        const binding =
          parseCookie(req.headers.cookie ?? "")[GOOGLE_BINDING_COOKIE] ?? "";
        if (!binding || !secureEqual(binding, document.binding))
          throw new AuthFailure("invalid_oauth_state", 400);
        const { maxAge: _age, ...options } = bindingOptions(req);
        res.clearCookie(GOOGLE_BINDING_COOKIE, options);
      }
      if (req.query.error) {
        const target = new URL(
          document.kind === "native" && document.redirectUri
            ? document.redirectUri
            : adapters.getFrontendAuthUri("/oauth/callback"),
        );
        target.searchParams.set(
          "error",
          "Google sign-in was cancelled. Please start again.",
        );
        return res.redirect(302, target.toString());
      }
      const code = typeof req.query.code === "string" ? req.query.code : "";
      if (!code) throw new AuthFailure("invalid_oauth_callback", 400);
      const saved = await service.consumeGoogleState(state);
      if (
        saved.kind !== document.kind ||
        saved.redirectUri !== document.redirectUri ||
        !secureEqual(hashToken(document.nonce), saved.nonceHash) ||
        !secureEqual(hashToken(document.verifier), saved.verifierHash)
      )
        throw new AuthFailure("invalid_oauth_state", 400);
      const google = await adapters.exchangeGoogleCode({
        code,
        codeVerifier: document.verifier,
        nonce: document.nonce,
      });
      const user = await service.googleUser(google);
      if (document.kind === "native") {
        if (
          !document.redirectUri ||
          !isAllowedGoogleNativeReturn(document.redirectUri)
        )
          throw new AuthFailure("invalid_oauth_state", 400);
        const bridge = await service.createBridgeCode(
          user.id,
          document.verifier,
        );
        const target = new URL(document.redirectUri);
        target.searchParams.set("code", bridge);
        return res.redirect(302, target.toString());
      }
      setCookie(req, res, await service.issueOAuthSession(user));
      res.redirect(302, adapters.getFrontendAuthUri("/oauth/callback"));
    }),
  );
  app.post(
    "/api/auth/google/exchange",
    wrap(async (req, res) => {
      if (!adapters.isGoogleConfigured())
        throw new AuthFailure("google_unavailable", 503);
      const body = bodyObject(req.body);
      strict(body, ["code", "verifier"]);
      if (
        typeof body.code !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(body.code) ||
        typeof body.verifier !== "string" ||
        !/^[A-Za-z0-9_-]{43,128}$/.test(body.verifier)
      )
        throw new AuthFailure("invalid_oauth_request", 400);
      await throttle(req, "google-exchange", 30);
      res.json(await service.exchangeBridgeCode(body.code, body.verifier));
    }),
  );
}
