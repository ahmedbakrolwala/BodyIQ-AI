import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { APP_SCHEME } from "@/shared/app-identity";

export const NATIVE_OAUTH_SCHEME = APP_SCHEME;
export const NATIVE_OAUTH_REDIRECT_URI = `${NATIVE_OAUTH_SCHEME}:///oauth/callback`;
export const NATIVE_OAUTH_VERIFIER_KEY = "manus-oauth-verifier";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<
  string,
  string | undefined
>;

const env = {
  portal:
    extra.oauthPortalUrl ?? process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server:
    extra.oauthServerUrl ?? process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: extra.appId ?? process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: extra.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

export function getApiBaseUrl(): string {
  if (API_BASE_URL) return API_BASE_URL.replace(/\/$/, "");

  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location
  ) {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) return `${protocol}//${apiHostname}`;
  }

  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

/** This is the fixed native callback registered by app.config.ts. */
export function getRedirectUri(): string {
  if (Platform.OS === "web") return `${getApiBaseUrl()}/api/oauth/callback`;
  // Expo Go supplies an exp/exps URI; standalone builds use the registered scheme.
  return Linking.createURL("/oauth/callback", { isTripleSlashed: true });
}

/** Browser callers use this only as a same-origin server start URL. */
export function getLoginUrl(): string {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) throw new Error("Manus login configuration is unavailable");
  return `${apiBaseUrl}/api/oauth/start`;
}

/**
 * Backwards-compatible entry point. The implementation lives in lib/sign-in
 * so hooks and screens can share native verifier storage and error handling.
 */
export async function startOAuthLogin(): Promise<void> {
  const { signIn } = await import("@/lib/sign-in");
  await signIn();
}

export const nativeCallbackUrl = getRedirectUri();
