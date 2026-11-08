import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { Request } from "express";
import { APP_SCHEME } from "../../shared/app-identity";

export const OAUTH_NONCE_COOKIE = "manus_oauth_nonce";
export const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;
export const NATIVE_OAUTH_SCHEME = APP_SCHEME;
// Linking.createURL("/oauth/callback", { scheme }) emits this triple-slash
// form for a custom scheme (empty host, /oauth/callback path).
export const NATIVE_OAUTH_REDIRECT_URI = `${NATIVE_OAUTH_SCHEME}:///oauth/callback`;

type OAuthStateDocument = {
  redirectUri: string;
  nonce: string;
};

type NativeNonceDocument = {
  nonce: string;
  verifierHash: string;
  redirectUri: string;
  expiresAt: number;
};

function secret(): string {
  return process.env.MANUS_JWT_SECRET ?? process.env.JWT_SECRET ?? "";
}

function encodeBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function decodeBase64(value: string): string {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error("Invalid base64");
  }
  const decoded = Buffer.from(value, "base64").toString("utf8");
  if (Buffer.from(decoded, "utf8").toString("base64") !== value) {
    throw new Error("Invalid base64");
  }
  return decoded;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
    "base64",
  ).toString("utf8");
}

function sign(value: string): string {
  const key = secret();
  if (!key) throw new Error("OAuth signing secret is not configured");
  return createHmac("sha256", key).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

function randomNonce(): string {
  return randomBytes(32).toString("base64url");
}

export function getOAuthCallbackUri(): string {
  const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!configuredApiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is required for OAuth");
  }

  let url: URL;
  try {
    url = new URL(configuredApiBaseUrl);
  } catch {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must be an absolute URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must use HTTP or HTTPS");
  }
  return `${url.origin}/api/oauth/callback`;
}

export function getNativeOAuthRedirectUri(): string {
  return NATIVE_OAUTH_REDIRECT_URI;
}

export function createBrowserOAuthState(redirectUri: string): {
  state: string;
  nonce: string;
} {
  const nonce = randomNonce();
  const document: OAuthStateDocument = { redirectUri, nonce };
  return { state: encodeBase64(JSON.stringify(document)), nonce };
}

export function createNativeOAuthState(
  redirectUri: string,
  verifier: string,
): string {
  if (!verifier || verifier.length < 32 || verifier.length > 512) {
    throw new Error("Invalid native OAuth verifier");
  }

  const document: NativeNonceDocument = {
    nonce: randomNonce(),
    verifierHash: createHash("sha256").update(verifier).digest("base64url"),
    redirectUri,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  };
  const encodedDocument = encodeBase64Url(JSON.stringify(document));
  const signedNonce = `${encodedDocument}.${sign(encodedDocument)}`;
  return encodeBase64(
    JSON.stringify({
      redirectUri,
      nonce: signedNonce,
    } satisfies OAuthStateDocument),
  );
}

export function decodeOAuthState(state: string): OAuthStateDocument {
  if (!state || state.length > 4096) throw new Error("Invalid OAuth state");
  let value: unknown;
  try {
    value = JSON.parse(decodeBase64(state));
  } catch {
    throw new Error("Invalid OAuth state");
  }
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as OAuthStateDocument).redirectUri !== "string" ||
    typeof (value as OAuthStateDocument).nonce !== "string" ||
    !(value as OAuthStateDocument).redirectUri ||
    !(value as OAuthStateDocument).nonce
  ) {
    throw new Error("Invalid OAuth state");
  }
  return value as OAuthStateDocument;
}

export function isAllowedNativeRedirectUri(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);
    if (url.username || url.password || url.search || url.hash) return false;
    const standalone =
      url.protocol === `${NATIVE_OAUTH_SCHEME}:` &&
      ((url.hostname === "oauth" && url.pathname === "/callback") ||
        (url.hostname === "" && url.pathname === "/oauth/callback")) &&
      !url.search &&
      !url.hash;
    if (standalone) return true;
    if (
      !["exp:", "exps:"].includes(url.protocol) ||
      url.pathname !== "/--/oauth/callback"
    )
      return false;
    const managedProxy = process.env.EXPO_PACKAGER_PROXY_URL;
    if (!managedProxy) return false;
    const configured = new URL(managedProxy);
    return url.host === configured.host;
  } catch {
    return false;
  }
}

export function verifyBrowserOAuthState(
  state: string,
  expectedNonce: string | undefined,
  expectedRedirectUri: string,
): boolean {
  try {
    const document = decodeOAuthState(state);
    return (
      document.redirectUri === expectedRedirectUri &&
      Boolean(expectedNonce) &&
      safeEqual(document.nonce, expectedNonce as string)
    );
  } catch {
    return false;
  }
}

export function verifyNativeOAuthState(
  state: string,
  verifier: string,
  expectedRedirectUri: string,
): boolean {
  try {
    const document = decodeOAuthState(state);
    if (document.redirectUri !== expectedRedirectUri || !verifier) return false;
    const [encodedDocument, signature, ...extra] = document.nonce.split(".");
    if (!encodedDocument || !signature || extra.length > 0) return false;
    if (!safeEqual(signature, sign(encodedDocument))) return false;

    const nonceDocument = JSON.parse(
      decodeBase64Url(encodedDocument),
    ) as Partial<NativeNonceDocument>;
    if (
      typeof nonceDocument.nonce !== "string" ||
      typeof nonceDocument.verifierHash !== "string" ||
      typeof nonceDocument.expiresAt !== "number" ||
      nonceDocument.redirectUri !== expectedRedirectUri ||
      nonceDocument.expiresAt < Date.now()
    ) {
      return false;
    }
    const verifierHash = createHash("sha256")
      .update(verifier)
      .digest("base64url");
    return safeEqual(nonceDocument.verifierHash, verifierHash);
  } catch {
    return false;
  }
}

export function isHttpsRequest(req: Request): boolean {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const values = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto?.split(",");
  return (
    values?.some((value) => value.trim().toLowerCase() === "https") ?? false
  );
}

export function getOAuthNonceCookieOptions(req: Request) {
  const secure =
    process.env.EXPO_PUBLIC_API_BASE_URL?.startsWith("https://") ||
    isHttpsRequest(req);
  return {
    httpOnly: true,
    maxAge: OAUTH_STATE_TTL_MS,
    path: "/",
    sameSite: secure ? ("none" as const) : ("lax" as const),
    secure,
  };
}
