import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AuthFrame, AuthFeedback } from "@/components/bodyiq/auth-form";
import { Body, Button, Card } from "@/components/bodyiq/ui";
import { clearGoogleAttempt, exchangeGoogleBridge } from "@/lib/account-auth";
import { useAuth } from "@/hooks/use-auth";
import { palette as p } from "@/constants/design";
export default function GoogleCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const { refresh } = useAuth();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const code = Array.isArray(params.code) ? params.code[0] : params.code;
    const run = async () => {
      try {
        if (params.error || !code)
          throw new Error("Google sign-in did not complete. Please try again.");
        await exchangeGoogleBridge(code);
        await refresh();
        if (active) router.replace("/(tabs)");
      } catch (e) {
        await clearGoogleAttempt();
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Google sign-in could not be verified.",
          );
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [params.code, params.error, refresh]);
  return (
    <AuthFrame
      title="Google sign-in"
      heading={error ? "Let’s try\nthat again." : "Connecting\nsecurely."}
      description="Your Google identity is verified by the backend before creating a BodyIQ session."
    >
      <Card>
        {error ? (
          <>
            <AuthFeedback error={error} />
            <Button
              title="Back to sign in"
              onPress={() => router.replace("/login")}
              secondary
            />
          </>
        ) : (
          <View style={{ alignItems: "center", gap: 18, padding: 24 }}>
            <ActivityIndicator color={p.green} />
            <Body>Completing Google sign-in…</Body>
          </View>
        )}
      </Card>
    </AuthFrame>
  );
}
