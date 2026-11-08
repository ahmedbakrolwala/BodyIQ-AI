import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
type AuthValue = {
  user: Auth.User | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  clearLocalSession: () => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);
function toUser(
  user: NonNullable<Awaited<ReturnType<typeof Api.getMe>>>,
): Auth.User {
  return { ...user, lastSignedIn: new Date(user.lastSignedIn) };
}
export function AuthProvider({ children }: PropsWithChildren) {
  const client = useQueryClient();
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const epoch = useRef(0);
  const currentUser = useRef<number | null>(null);
  const clearLocalSession = useCallback(async () => {
    epoch.current++;
    currentUser.current = null;
    await Auth.removeSessionToken();
    await Auth.clearUserInfo();
    setUser(null);
    setError(null);
    setLoading(false);
    await client.cancelQueries();
    client.removeQueries();
  }, [client]);
  const refresh = useCallback(async () => {
    const request = ++epoch.current;
    setLoading(true);
    setError(null);
    try {
      if (Platform.OS !== "web" && !(await Auth.getSessionToken())) {
        if (request === epoch.current) {
          setUser(null);
          currentUser.current = null;
        }
        return;
      }
      const result = await Api.getMe();
      if (request !== epoch.current) return;
      if (!result) {
        await Auth.removeSessionToken();
        await Auth.clearUserInfo();
        const hadUser = currentUser.current !== null;
        currentUser.current = null;
        setUser(null);
        if (hadUser) {
          await client.cancelQueries();
          client.removeQueries();
        }
        return;
      }
      if (currentUser.current !== null && currentUser.current !== result.id) {
        await client.cancelQueries();
        client.removeQueries();
      }
      if (request !== epoch.current) return;
      currentUser.current = result.id;
      setUser(toUser(result));
      await Auth.setUserInfo(toUser(result));
    } catch (e) {
      if (request === epoch.current) {
        setError(
          e instanceof Error
            ? e
            : new Error("We could not verify your connection."),
        );
        setUser(null);
      }
    } finally {
      if (request === epoch.current) setLoading(false);
    }
  }, [client]);
  const logout = useCallback(async () => {
    epoch.current++;
    try {
      await Api.logout();
    } catch (e) {
      if (!(e instanceof Api.ApiError && e.status === 401)) throw e;
    }
    await clearLocalSession();
  }, [clearLocalSession]);
  const invalidateRequests = useCallback(() => {
    epoch.current++;
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => {
      void refresh();
    }, 0);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const focus = () => {
      void refresh();
    };
    if (Platform.OS === "web") window.addEventListener("focus", focus);
    return () => {
      clearTimeout(initial);
      invalidateRequests();
      subscription.remove();
      if (Platform.OS === "web") window.removeEventListener("focus", focus);
    };
  }, [refresh, invalidateRequests]);
  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
      refresh,
      logout,
      clearLocalSession,
    }),
    [user, loading, error, refresh, logout, clearLocalSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(_options?: { autoFetch?: boolean }) {
  void _options;
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}
