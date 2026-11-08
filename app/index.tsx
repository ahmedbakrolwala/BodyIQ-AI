import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FadeIn, Logo } from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";

export default function SplashScreen() {
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      let entered = false;
      try {
        entered = (await AsyncStorage.getItem("bodyiq:entered")) === "true";
      } catch {
        /* Welcome works without local storage. */
      }
      if (active) router.replace(entered ? "/(tabs)" : "/welcome");
    }, 1100);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  return (
    <View style={styles.screen}>
      <FadeIn style={{ alignItems: "center", gap: 24 }}>
        <Logo size={72} compact />
        <Text style={styles.brand}>
          BODYIQ <Text style={{ color: p.green }}>AI</Text>
        </Text>
        <Text style={styles.tagline}>
          Your Body. Your Goals. Your AI Coach.
        </Text>
        <ActivityIndicator
          color={p.green}
          style={{ marginTop: 30 }}
          accessibilityLabel="Loading BodyIQ AI"
        />
      </FadeIn>
      <Text style={styles.footer}>BUILT AROUND YOU.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: p.background,
    padding: 20,
  },
  brand: { color: p.text, fontSize: 32, fontWeight: "900", letterSpacing: 2 },
  tagline: { color: p.muted, fontSize: 12, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 45,
    color: p.muted,
    fontSize: 9,
    letterSpacing: 3,
  },
});
