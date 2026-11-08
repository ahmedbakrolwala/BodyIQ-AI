import { Platform } from "react-native";
import { getApiBaseUrl } from "../../constants/oauth";
import * as Auth from "./auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-BodyIQ-Client": "bodyiq-app",
    "X-BodyIQ-Platform": Platform.OS === "web" ? "web" : "native",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Determine the auth method:
  // - Native platform: use stored session token as Bearer auth
  // - Web (including iframe): use cookie-based auth (browser handles automatically)
  //   Cookie is set on backend domain via POST /api/auth/session after receiving token via postMessage
  if (Platform.OS !== "web") {
    const sessionToken = await Auth.getSessionToken();
    console.log("[API] Native request prepared");
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
      console.log("[API] Authorization header added");
    }
  } else {
    console.log("[API] Web request prepared");
  }

  const baseUrl = getApiBaseUrl();
  // Ensure no double slashes between baseUrl and endpoint
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${cleanBaseUrl}${cleanEndpoint}` : endpoint;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    console.log("[API] Making request...");
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
      signal: options.signal ?? controller.signal,
    });

    console.log("[API] Response received");
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status !== 401)
        console.warn("[API] Error response received");
      let errorMessage =
        "The service could not complete this request. Please try again.";
      let errorCode: string | undefined;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage =
          typeof errorJson.error === "string"
            ? errorJson.error
            : typeof errorJson.message === "string"
              ? errorJson.message
              : errorMessage;
        errorCode =
          typeof errorJson.code === "string" ? errorJson.code : undefined;
      } catch {
        // Not JSON, use text as is
      }
      throw new ApiError(
        errorMessage || `API call failed: ${response.statusText}`,
        response.status,
        errorCode,
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log("[API] JSON response received");
      return data as T;
    }

    const text = await response.text();
    console.log("[API] Text response received");
    return (text ? JSON.parse(text) : {}) as T;
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401))
      console.warn("[API] Request failed");
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        "The connection took too long. Please check your network and try again.",
      );
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred");
  } finally {
    clearTimeout(timer);
  }
}

// OAuth callback handler - exchange code plus the SecureStore verifier.
// The server returns a signed application token; callers must still validate
// it through /api/auth/me before treating the user as authenticated.
export async function exchangeOAuthCode(
  code: string,
  state: string,
  verifier: string,
): Promise<{ sessionToken: string }> {
  console.log("[API] exchangeOAuthCode called");
  const result = await apiCall<{ sessionToken?: string }>("/api/oauth/mobile", {
    method: "POST",
    body: JSON.stringify({ code, state, verifier }),
  });
  if (!result.sessionToken)
    throw new Error("OAuth exchange returned no session token");
  console.log("[API] OAuth exchange completed");
  return { sessionToken: result.sessionToken };
}

// Logout
export async function logout(): Promise<void> {
  await apiCall<void>("/api/auth/logout", {
    method: "POST",
  });
}

// Get current authenticated user (web uses cookie-based auth)
export async function getMe(): Promise<{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: string;
  authProvider?: "email" | "google" | "manus";
  emailVerified?: boolean;
  canDeleteWithPassword?: boolean;
  requiresReauthentication?: boolean;
} | null> {
  try {
    const result = await apiCall<{ user: any }>("/api/auth/me");
    return result.user || null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

// Establish session cookie on the backend (3000-xxx domain)
// Called after receiving token via postMessage to get a proper Set-Cookie from the backend
export async function establishSession(token: string): Promise<boolean> {
  try {
    console.log("[API] establishSession: setting cookie on backend...");
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/auth/session`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-BodyIQ-Client": "bodyiq-app",
        "X-BodyIQ-Platform": Platform.OS === "web" ? "web" : "native",
      },
      credentials: "include", // Important: allows Set-Cookie to be stored
    });

    if (!response.ok) {
      console.error("[API] establishSession failed");
      return false;
    }

    console.log("[API] establishSession: cookie set successfully");
    return true;
  } catch {
    console.error("[API] establishSession error");
    return false;
  }
}
