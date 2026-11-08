import { useState } from "react";
import {
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Badge,
  Body,
  Button,
  FadeIn,
  Icon,
  Logo,
  Screen,
} from "@/components/bodyiq/ui";
import { palette as p, trainingImage } from "@/constants/design";
import { signIn } from "@/lib/sign-in";

export default function WelcomeScreen() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function enter() {
    try {
      await AsyncStorage.setItem("bodyiq:entered", "true");
    } catch {
      /* Local preference is optional. */
    }
    router.replace("/(tabs)");
  }
  async function login() {
    setBusy(true);
    setError("");
    try {
      await signIn();
    } catch {
      setError("Could not open secure sign-in. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <View style={styles.top}>
        <Logo />
        <Badge text="PHASE 01" />
      </View>
      <ImageBackground
        source={
          Platform.OS === "web"
            ? { uri: trainingImage }
            : require("@/assets/images/training.jpg")
        }
        style={styles.hero}
        imageStyle={{ borderRadius: 24 }}
      >
        <View style={styles.imageTint} />
        <View style={styles.heroContent}>
          <Badge text="A STRONGER YOU, AHEAD" />
          <Text style={styles.heroTitle}>
            Built for{"\n"}your next{"\n"}
            <Text style={{ color: p.green }}>version.</Text>
          </Text>
          <View style={styles.heroFoot}>
            <Icon name="activity" color={p.green} size={16} />
            <Text style={styles.heroSmall}>INTELLIGENCE IN EVERY MOVE</Text>
          </View>
        </View>
      </ImageBackground>
      <FadeIn>
        <Text style={styles.title}>
          Your body. Your goals.{"\n"}Your AI coach.
        </Text>
        <Body>
          A smarter home for your fitness journey. Nutrition, movement, and
          progress — together in one place.
        </Body>
        <View style={styles.features}>
          {[
            { icon: "target", label: "Made for you" },
            { icon: "shield", label: "Private by design" },
            { icon: "globe", label: "Built for everyone" },
          ].map((item) => (
            <View key={item.label} style={styles.feature}>
              <Icon name={item.icon as "target"} size={17} color={p.green} />
              <Text style={styles.featureText}>{item.label}</Text>
            </View>
          ))}
        </View>
        <Button
          title={busy ? "Opening secure sign-in…" : "Start your journey"}
          onPress={login}
          disabled={busy}
        />
        <View style={{ height: 10 }} />
        <Button
          title="Explore the app"
          onPress={enter}
          secondary
          icon="compass"
        />
        {error ? (
          <Text
            accessibilityRole="alert"
            style={{ color: p.error, marginTop: 14 }}
          >
            {error}
          </Text>
        ) : null}
        <Text style={styles.note}>
          You’re exploring Phase 1. AI coaching and fitness tracking are coming
          in future phases. Sign in to save your basic profile.
        </Text>
      </FadeIn>
      <View style={styles.bottom}>
        <View style={{ height: 1, flex: 1, backgroundColor: p.border }} />
        <Text style={styles.bottomText}>YOUR NEXT CHAPTER STARTS HERE</Text>
        <View style={{ height: 1, flex: 1, backgroundColor: p.border }} />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  hero: {
    minHeight: 340,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 26,
    backgroundColor: p.surface,
  },
  imageTint: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#00000035",
  },
  heroContent: { padding: 24, justifyContent: "space-between", minHeight: 340 },
  heroTitle: {
    color: p.text,
    fontSize: 45,
    fontWeight: "700",
    letterSpacing: -2,
    lineHeight: 50,
    marginVertical: 30,
  },
  heroFoot: { flexDirection: "row", alignItems: "center", gap: 7 },
  heroSmall: {
    color: p.text,
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: "600",
  },
  title: {
    color: p.text,
    fontSize: 27,
    fontWeight: "600",
    letterSpacing: -0.9,
    marginBottom: 12,
  },
  features: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 28,
  },
  feature: { flex: 1, gap: 9 },
  featureText: { color: p.muted, fontSize: 10, lineHeight: 16 },
  note: {
    color: p.muted,
    fontSize: 10,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 10,
  },
  bottom: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 32,
  },
  bottomText: { color: p.muted, fontSize: 8, letterSpacing: 1.2 },
});
