import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiCall, getMe } from "./_core/api";
import * as Auth from "./_core/auth";
import { getApiBaseUrl } from "@/constants/oauth";
import { normalizeEmail } from "./auth-validation";
export const GOOGLE_VERIFIER_KEY = "bodyiq:google-verifier";
export type AuthCapabilities = {
  google: boolean;
  emailPassword: boolean;
  emailDelivery: boolean;
  accountDeletion: boolean;
};
export type AuthMessage = { message: string; email?: string };
export const getAuthCapabilities = () =>
  apiCall<AuthCapabilities>("/api/auth/capabilities");
const post = <T>(path: string, body: unknown) =>
  apiCall<T>(path, { method: "POST", body: JSON.stringify(body) });
export const registerAccount = (
  name: string,
  email: string,
  password: string,
) =>
  post<AuthMessage>("/api/auth/register", {
    name: name.trim(),
    email: normalizeEmail(email),
    password,
  });
export const verifyEmail = (token: string) =>
  post<AuthMessage>("/api/auth/verify-email", { token });
export const resendVerification = (email: string) =>
  post<AuthMessage>("/api/auth/resend-verification", {
    email: normalizeEmail(email),
  });
export const forgotPassword = (email: string) =>
  post<AuthMessage>("/api/auth/forgot-password", {
    email: normalizeEmail(email),
  });
export const resetPassword = (token: string, password: string) =>
  post<AuthMessage>("/api/auth/reset-password", { token, password });
export const deleteAccount = (password?: string) =>
  post<{ success: boolean }>("/api/auth/account/delete", {
    confirmation: "DELETE MY ACCOUNT",
    ...(password ? { password } : {}),
  });
export async function acceptLogin(result: { sessionToken?: string }) {
  if (Platform.OS !== "web") {
    if (!result.sessionToken)
      throw new Error("The server did not return a valid mobile session.");
    await Auth.setSessionToken(result.sessionToken);
  }
  try {
    const user = await getMe();
    if (!user)
      throw new Error("Your session could not be confirmed. Please try again.");
    await AsyncStorage.setItem("bodyiq:entered", "true").catch(() => {});
    return user;
  } catch (error) {
    if (Platform.OS !== "web") await Auth.removeSessionToken();
    throw error;
  }
}
export async function loginAccount(email: string, password: string) {
  const result = await post<{ sessionToken?: string }>("/api/auth/login", {
    email: normalizeEmail(email),
    password,
  });
  return acceptLogin(result);
}
export async function startGoogleLogin() {
  if (Platform.OS === "web") {
    const base = getApiBaseUrl();
    if (typeof window === "undefined")
      throw new Error("Browser sign-in is unavailable.");
    window.location.assign(`${base}/api/auth/google/start`);
    return;
  }
  const verifier = Array.from(Crypto.getRandomBytes(32), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  await SecureStore.setItemAsync(GOOGLE_VERIFIER_KEY, verifier);
  try {
    const result = await post<{ authorizationUrl: string }>(
      "/api/auth/google/start",
      { verifier, redirectUri: Linking.createURL("/auth/google-callback") },
    );
    if (!result.authorizationUrl?.startsWith("https://accounts.google.com/"))
      throw new Error("The Google login service returned an invalid URL.");
    await Linking.openURL(result.authorizationUrl);
  } catch (error) {
    await SecureStore.deleteItemAsync(GOOGLE_VERIFIER_KEY);
    throw error;
  }
}
export async function clearGoogleAttempt() {
  await SecureStore.deleteItemAsync(GOOGLE_VERIFIER_KEY);
}
export async function exchangeGoogleBridge(code: string) {
  const verifier = await SecureStore.getItemAsync(GOOGLE_VERIFIER_KEY);
  if (!verifier)
    throw new Error(
      "This Google login attempt has expired. Please start again.",
    );
  try {
    const result = await post<{ sessionToken: string }>(
      "/api/auth/google/exchange",
      { code, verifier },
    );
    return acceptLogin(result);
  } finally {
    await SecureStore.deleteItemAsync(GOOGLE_VERIFIER_KEY);
  }
}
