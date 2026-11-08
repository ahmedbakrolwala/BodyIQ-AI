import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Body, Button, Card, Icon, Logo, Screen } from "./ui";
import { BackHeader } from "./premium";
import { palette as p } from "@/constants/design";
import { signIn } from "@/lib/sign-in";

export function AuthScreen({ register = false }: { register?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function authenticate() {
    setBusy(true);
    setError("");
    try {
      await signIn();
    } catch {
      setError("Secure sign-in could not be opened. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function explore() {
    try {
      await AsyncStorage.setItem("bodyiq:entered", "true");
    } catch {}
    router.replace("/(tabs)");
  }
  return (
    <Screen preview={false}>
      <BackHeader title={register ? "Create account" : "Sign in"} />
      <View style={v.brand}>
        <Logo size={38} />
        <Text style={v.topline}>YOUR NEXT CHAPTER STARTS HERE</Text>
      </View>
      <Text style={v.title}>
        {register ? "A stronger you.\nStarts here." : "Welcome\nback."}
      </Text>
      <Body style={{ fontSize: 14, marginBottom: 28 }}>
        {register
          ? "One account. Your goals, your journey, your future AI coach."
          : "Your goals are waiting. Let’s pick up where you left off."}
      </Body>
      <Card style={{ padding: 24 }}>
        <View style={v.secureIcon}>
          <Icon
            name={register ? "user-plus" : "lock"}
            color={p.green}
            size={26}
          />
        </View>
        <Text style={v.cardTitle}>
          {register
            ? "Make BodyIQ yours."
            : "Your fitness. Securely connected."}
        </Text>
        <Body style={{ fontSize: 12, marginBottom: 22 }}>
          Continue with your Manus account. Authentication happens through the
          secure account provider — BodyIQ never asks for or stores your
          password.
        </Body>
        <Button
          title={
            busy
              ? "Opening secure access…"
              : register
                ? "Create your BodyIQ account"
                : "Continue with Manus"
          }
          onPress={authenticate}
          disabled={busy}
          icon={register ? "user-plus" : "arrow-right"}
        />
        <View style={v.lockRow}>
          <Icon name="shield" size={13} color={p.green} />
          <Text style={v.lockText}>SECURE OAUTH · PRIVATE BY DESIGN</Text>
        </View>
        {register && (
          <Body style={{ fontSize: 10, lineHeight: 17, marginTop: 18 }}>
            Sign in to Manus, or create a Manus account in the secure provider
            flow. First-time sign-in creates your BodyIQ account. Only your
            basic profile is saved today.
          </Body>
        )}
      </Card>
      {error ? (
        <Text accessibilityRole="alert" style={v.error}>
          {error}
        </Text>
      ) : null}
      <View style={v.alternate}>
        <Text style={v.alternateText}>
          {register ? "Already have an account?" : "New to BodyIQ AI?"}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace(register ? "/login" : "/register")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={v.alternateLink}>
            {register ? "Sign in" : "Create account"}
          </Text>
        </Pressable>
      </View>
      <Button
        title="Explore the design preview"
        secondary
        onPress={explore}
        icon="compass"
      />
      <View style={v.links}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/support?section=privacy")}
        >
          <Text style={v.smallLink}>Privacy overview</Text>
        </Pressable>
        <Text style={v.smallLink}>·</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/support?section=help")}
        >
          <Text style={v.smallLink}>Need help?</Text>
        </Pressable>
      </View>
      <Text style={v.disclaimer}>
        Design preview data is illustrative, not your activity. Real AI coaching
        and food recognition are not active yet.
      </Text>
    </Screen>
  );
}
const v = StyleSheet.create({
  brand: { alignItems: "center", gap: 14, marginTop: 24, marginBottom: 36 },
  topline: { color: p.muted, fontSize: 9, letterSpacing: 1.5 },
  title: {
    color: p.text,
    fontSize: 42,
    lineHeight: 47,
    fontWeight: "700",
    letterSpacing: -1.7,
    marginBottom: 14,
  },
  secureIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: p.greenDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cardTitle: {
    color: p.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    lineHeight: 25,
  },
  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 17,
  },
  lockText: { color: p.muted, fontSize: 8, letterSpacing: 0.7 },
  error: { color: p.error, fontSize: 12, marginTop: 18, lineHeight: 19 },
  alternate: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginVertical: 20,
  },
  alternateText: { color: p.muted, fontSize: 12 },
  alternateLink: { color: p.green, fontSize: 12, fontWeight: "600" },
  links: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    marginTop: 26,
  },
  smallLink: { color: p.muted, fontSize: 10 },
  disclaimer: {
    color: p.muted,
    fontSize: 10,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 20,
  },
});
