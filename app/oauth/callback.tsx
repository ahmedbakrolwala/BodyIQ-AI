import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { NATIVE_OAUTH_VERIFIER_KEY } from "@/constants/oauth";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BLACK = "#090B0A";
const GREEN = "#C3FF5C";

type CallbackStatus = "processing" | "success" | "error";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string | string[];
    state?: string | string[];
    error?: string | string[];
  }>();
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [errorMessage, setErrorMessage] = useState(
    "We couldn't complete sign in.",
  );

  useEffect(() => {
    let active = true;

    const complete = async () => {
      try {
        const error = firstParam(params.error);
        if (error) throw new Error(error);

        if (Platform.OS === "web") {
          const user = await Api.getMe();
          if (!user) throw new Error("Your login session was not established.");
        } else {
          let code = firstParam(params.code);
          let state = firstParam(params.state);
          if (!code || !state) {
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
              const parsed = new URL(initialUrl);
              code = parsed.searchParams.get("code") ?? undefined;
              state = parsed.searchParams.get("state") ?? undefined;
            }
          }
          if (!code || !state)
            throw new Error("The login callback is missing code or state.");

          const verifier = await SecureStore.getItemAsync(
            NATIVE_OAUTH_VERIFIER_KEY,
          );
          if (!verifier)
            throw new Error(
              "This login attempt has expired. Please try again.",
            );

          try {
            const result = await Api.exchangeOAuthCode(code, state, verifier);
            await Auth.setSessionToken(result.sessionToken);
            const user = await Api.getMe();
            if (!user)
              throw new Error(
                "The returned login session could not be validated.",
              );
            await Auth.setUserInfo({
              id: user.id,
              openId: user.openId,
              name: user.name,
              email: user.email,
              loginMethod: user.loginMethod,
              lastSignedIn: new Date(user.lastSignedIn),
            });
          } finally {
            await SecureStore.deleteItemAsync(NATIVE_OAUTH_VERIFIER_KEY);
          }
        }

        try {
          await AsyncStorage.setItem("bodyiq:entered", "true");
        } catch {
          /* Optional local preference. */
        }
        if (active) {
          setStatus("success");
          setTimeout(() => {
            if (active) router.replace("/(tabs)");
          }, 700);
        }
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We couldn't complete sign in.",
        );
      }
    };

    void complete();
    return () => {
      active = false;
    };
  }, [params.code, params.state, params.error, router]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BLACK }}>
      <View
        style={{
          flex: 1,
          backgroundColor: BLACK,
          padding: 24,
          justifyContent: "center",
        }}
      >
        <View style={{ alignItems: "center", gap: 18 }}>
          {status === "processing" && (
            <>
              <ActivityIndicator color={GREEN} size="large" />
              <Text
                style={{ color: "white", fontSize: 17, textAlign: "center" }}
              >
                Completing your secure sign in…
              </Text>
            </>
          )}
          {status === "success" && (
            <>
              <Text
                style={{
                  color: GREEN,
                  fontSize: 24,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                You’re signed in
              </Text>
              <Text
                style={{ color: "white", fontSize: 16, textAlign: "center" }}
              >
                Taking you back to BodyIQ AI…
              </Text>
            </>
          )}
          {status === "error" && (
            <>
              <Text
                style={{
                  color: "white",
                  fontSize: 24,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                Sign in didn’t finish
              </Text>
              <Text
                style={{
                  color: "#C9D0CB",
                  fontSize: 16,
                  lineHeight: 23,
                  textAlign: "center",
                }}
              >
                {errorMessage}
              </Text>
              <View style={{ width: "100%", gap: 12, marginTop: 8 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace("/(tabs)")}
                  style={{
                    backgroundColor: GREEN,
                    borderRadius: 12,
                    padding: 15,
                  }}
                >
                  <Text
                    style={{
                      color: BLACK,
                      fontSize: 16,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    Back to BodyIQ AI
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={goBack}
                  style={{
                    borderColor: GREEN,
                    borderRadius: 12,
                    borderWidth: 1,
                    padding: 14,
                  }}
                >
                  <Text
                    style={{
                      color: GREEN,
                      fontSize: 16,
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    Go back
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
