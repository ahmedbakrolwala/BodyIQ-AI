import { timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUER = "https://accounts.google.com";
const REQUEST_TIMEOUT_MS = 10_000;
const GOOGLE_JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_ENDPOINT));

class GoogleAdapterError extends Error {
  readonly code: "google_configuration_unavailable" | "google_provider_error";

  constructor(
    name: "GoogleConfigurationError" | "GoogleProviderError",
    code: "google_configuration_unavailable" | "google_provider_error",
    message: string,
  ) {
    super(message);
    this.name = name;
    this.code = code;
  }
}

function nonEmptyEnv(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

function configuredOrigin(...names: string[]): string | null {
  const configured = nonEmptyEnv(...names);
  if (!configured) {
    return null;
  }
  try {
    const url = new URL(configured);
    if (
      !(
        url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
      ) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function clientId(): string | null {
  return nonEmptyEnv("AUTH_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID");
}

function clientSecret(): string | null {
  return nonEmptyEnv("AUTH_GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET");
}

function frontendOrigin(): string | null {
  return configuredOrigin(
    "AUTH_PUBLIC_FRONTEND_URL",
    "EXPO_WEB_PREVIEW_URL",
    "EXPO_PUBLIC_FRONTEND_URL",
  );
}

function apiOrigin(): string | null {
  return configuredOrigin("AUTH_PUBLIC_API_URL", "EXPO_PUBLIC_API_BASE_URL");
}

export function isGoogleConfigured(): boolean {
  return Boolean(
    clientId() && clientSecret() && apiOrigin() && frontendOrigin(),
  );
}

export function getGoogleCallbackUri(): string {
  const origin = apiOrigin();
  if (!origin) {
    throw new GoogleAdapterError(
      "GoogleConfigurationError",
      "google_configuration_unavailable",
      "Google OAuth is not configured",
    );
  }
  return `${origin}/api/auth/google/callback`;
}

const ALLOWED_FRONTEND_AUTH_PATHS = new Set([
  "/oauth/callback",
  "/auth/google-callback",
]);

export function getFrontendAuthUri(path: string): string {
  const origin = frontendOrigin();
  if (!origin || !ALLOWED_FRONTEND_AUTH_PATHS.has(path)) {
    throw new GoogleAdapterError(
      "GoogleConfigurationError",
      "google_configuration_unavailable",
      "Google frontend callback is not configured",
    );
  }
  return `${origin}${path}`;
}

function oauthParameter(value: string, name: string, maxLength = 512): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    /[^A-Za-z0-9._~-]/.test(value)
  ) {
    throw new GoogleAdapterError(
      "GoogleConfigurationError",
      "google_configuration_unavailable",
      `Invalid OAuth ${name}`,
    );
  }
  return value;
}

function authorizationCode(value: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 2048 ||
    /[\u0000-\u001f\u007f\s]/.test(value)
  ) {
    throw new GoogleAdapterError(
      "GoogleConfigurationError",
      "google_configuration_unavailable",
      "Invalid OAuth authorization code",
    );
  }
  return value;
}

export function buildGoogleAuthorizationUrl({
  state,
  nonce,
  codeChallenge,
}: {
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const id = clientId();
  if (!id) {
    throw new GoogleAdapterError(
      "GoogleConfigurationError",
      "google_configuration_unavailable",
      "Google OAuth is not configured",
    );
  }

  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", getGoogleCallbackUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", oauthParameter(state, "state"));
  url.searchParams.set("nonce", oauthParameter(nonce, "nonce"));
  url.searchParams.set(
    "code_challenge",
    oauthParameter(codeChallenge, "code challenge", 128),
  );
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

function equalSecret(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

function providerFailure(): GoogleAdapterError {
  return new GoogleAdapterError(
    "GoogleProviderError",
    "google_provider_error",
    "Google OAuth provider request failed",
  );
}

interface GoogleIdTokenClaims extends JWTPayload {
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
}

export async function exchangeGoogleCode({
  code,
  codeVerifier,
  nonce,
}: {
  code: string;
  codeVerifier: string;
  nonce: string;
}): Promise<{ subject: string; email: string; name: string }> {
  const id = clientId();
  const secret = clientSecret();
  if (!id || !secret) {
    throw new GoogleAdapterError(
      "GoogleConfigurationError",
      "google_configuration_unavailable",
      "Google OAuth is not configured",
    );
  }

  const authorizationCodeValue = authorizationCode(code);
  const verifier = oauthParameter(codeVerifier, "code verifier", 128);
  const expectedNonce = oauthParameter(nonce, "nonce");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: authorizationCodeValue,
        client_id: id,
        client_secret: secret,
        redirect_uri: getGoogleCallbackUri(),
        grant_type: "authorization_code",
        code_verifier: verifier,
      }).toString(),
      signal: controller.signal,
    });
  } catch {
    throw providerFailure();
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw providerFailure();
  }

  let tokenResponse: unknown;
  try {
    tokenResponse = await response.json();
  } catch {
    throw providerFailure();
  }
  const idToken =
    typeof tokenResponse === "object" &&
    tokenResponse !== null &&
    "id_token" in tokenResponse &&
    typeof tokenResponse.id_token === "string"
      ? tokenResponse.id_token
      : null;
  if (!idToken) {
    throw providerFailure();
  }

  let payload: GoogleIdTokenClaims;
  try {
    const verified = await jwtVerify<GoogleIdTokenClaims>(
      idToken,
      GOOGLE_JWKS,
      {
        algorithms: ["RS256"],
        issuer: GOOGLE_ISSUER,
        audience: id,
      },
    );
    payload = verified.payload;
  } catch {
    throw providerFailure();
  }

  if (
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    typeof payload.email !== "string" ||
    !payload.email ||
    payload.email_verified !== true ||
    typeof payload.exp !== "number" ||
    payload.exp <= Math.floor(Date.now() / 1000) ||
    typeof payload.nonce !== "string" ||
    !equalSecret(payload.nonce, expectedNonce)
  ) {
    throw providerFailure();
  }

  return {
    subject: payload.sub,
    email: payload.email,
    name: typeof payload.name === "string" ? payload.name : "",
  };
}
