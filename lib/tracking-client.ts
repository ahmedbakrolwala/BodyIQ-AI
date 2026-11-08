import { useCallback, useEffect } from "react";
import { AppState, Platform } from "react-native";
import { useQueryClient, focusManager } from "@tanstack/react-query";
import { shouldRefreshTracking } from "./tracking-refresh";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
export function getDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
export function useTrackingSummary() {
  const auth = useAuth();
  return trpc.tracking.get.useQuery(
    { timeZone: getDeviceTimeZone() },
    {
      enabled: auth.isAuthenticated,
      retry: false,
      staleTime: 5000,
      refetchInterval: 30000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  );
}
export function useRefreshTracking() {
  const utils = trpc.useUtils();
  return useCallback(async () => {
    await Promise.all([
      utils.tracking.get.invalidate(),
      utils.fitness.get.invalidate(),
      utils.profile.get.invalidate(),
    ]);
  }, [utils]);
}
export function TrackingRefreshBridge() {
  const auth = useAuth();
  const utils = trpc.useUtils();
  const client = useQueryClient();
  useEffect(() => {
    const refresh = () => {
      if (auth.isAuthenticated) void utils.tracking.get.invalidate();
    };
    const unsubscribe = client.getMutationCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") return;
      if (shouldRefreshTracking(event.mutation.options.mutationKey)) refresh();
    });
    if (Platform.OS !== "web")
      focusManager.setFocused(AppState.currentState === "active");
    const sub = AppState.addEventListener("change", (state) => {
      if (Platform.OS !== "web") focusManager.setFocused(state === "active");
      if (state === "active") refresh();
    });
    const visibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    if (Platform.OS === "web" && typeof document !== "undefined")
      document.addEventListener("visibilitychange", visibility);
    return () => {
      unsubscribe();
      sub.remove();
      if (Platform.OS === "web" && typeof document !== "undefined")
        document.removeEventListener("visibilitychange", visibility);
    };
  }, [auth.isAuthenticated, auth.user?.id, client, utils]);
  return null;
}
