import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import {
  getApiBaseUrl,
  getLoginUrl,
  NATIVE_OAUTH_VERIFIER_KEY,
} from "@/constants/oauth";

function makeVerifier(): string {
  const bytes = Crypto.getRandomBytes(32);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function startUrl(): string {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error("The BodyIQ API URL is not configured");
  return `${baseUrl}/api/oauth/start`;
}

/** Start Manus OAuth on web or native. Callback completion is handled by the callback route. */
export async function signIn(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined")
        throw new Error("Browser login is unavailable");
      window.location.assign(getLoginUrl());
      return;
    }

    const verifier = makeVerifier();
    await SecureStore.setItemAsync(NATIVE_OAUTH_VERIFIER_KEY, verifier);

    const response = await fetch(startUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verifier,
        redirectUri: Linking.createURL("/oauth/callback"),
      }),
    });
    if (!response.ok) {
      throw new Error("Unable to start Manus login");
    }
    const payload = (await response.json()) as { authorizationUrl?: unknown };
    if (
      typeof payload.authorizationUrl !== "string" ||
      !payload.authorizationUrl
    ) {
      throw new Error(
        "The login service returned an invalid authorization URL",
      );
    }

    const canOpen = await Linking.canOpenURL(payload.authorizationUrl);
    if (!canOpen)
      throw new Error("This device cannot open the Manus login page");
    await Linking.openURL(payload.authorizationUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start login";
    console.error("[Auth] signIn failed", message);
    throw new Error(message);
  }
}
