import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

function toUser(
  apiUser: NonNullable<Awaited<ReturnType<typeof Api.getMe>>>,
): Auth.User {
  return {
    id: apiUser.id,
    openId: apiUser.openId,
    name: apiUser.name,
    email: apiUser.email,
    loginMethod: apiUser.loginMethod,
    lastSignedIn: new Date(apiUser.lastSignedIn),
  };
}

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (Platform.OS !== "web" && !(await Auth.getSessionToken())) {
        setUser(null);
        await Auth.clearUserInfo();
        return;
      }

      // Both platforms must ask the server. On web this validates the cookie;
      // on native apiCall attaches the SecureStore Bearer token.
      const apiUser = await Api.getMe();
      if (!apiUser) {
        setUser(null);
        if (Platform.OS !== "web") await Auth.removeSessionToken();
        await Auth.clearUserInfo();
        return;
      }

      const userInfo = toUser(apiUser);
      setUser(userInfo);
      await Auth.setUserInfo(userInfo);
    } catch (err) {
      const authError =
        err instanceof Error ? err : new Error("Failed to fetch user");
      setError(authError);
      setUser(null);
      // Keep stored credentials on transport errors; only a real 401 clears them.
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch {
      console.error("[Auth] Logout API call failed");
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    if (autoFetch) void fetchUser();
    else setLoading(false);
  }, [autoFetch, fetchUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
