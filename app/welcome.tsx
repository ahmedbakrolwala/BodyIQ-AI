import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Badge,
  Body,
  Button,
  Icon,
  Logo,
  Screen,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
export default function WelcomeScreen() {
  async function enter() {
    try {
      await AsyncStorage.setItem("bodyiq:entered", "true");
    } catch {}
    router.replace("/(tabs)");
  }
  return (
    <Screen preview={false}>
      <View style={w.top}>
        <Logo size={34} />
        <Badge text="BUILT AROUND YOU" />
      </View>
      <ImageBackground
        source={require("@/assets/images/training.jpg")}
        style={w.hero}
        imageStyle={{ borderRadius: 26, width: "100%", height: "100%" }}
      >
        <View style={w.tint} />
        <View style={w.heroContent}>
          <View style={w.heroTag}>
            <Icon name="zap" color={p.green} size={14} />
            <Text style={w.heroTagText}>INTELLIGENCE IN EVERY MOVE</Text>
          </View>
          <Text style={w.heroTitle}>
            Your next{"\n"}version{"\n"}
            <Text style={{ color: p.green }}>starts here.</Text>
          </Text>
          <View style={w.heroFoot}>
            <View style={w.line} />
            <Text style={w.heroFootText}>MOVE BETTER. LIVE STRONGER.</Text>
          </View>
        </View>
      </ImageBackground>
      <Text style={w.title}>Your body. Your goals.{"\n"}Your AI coach.</Text>
      <Body style={{ fontSize: 14 }}>
        A smarter home for your fitness journey. Food, movement, and progress —
        connected around you.
      </Body>
      <View style={w.features}>
        {[
          { icon: "target", title: "Built for your goals" },
          { icon: "shield", title: "Private by design" },
          { icon: "globe", title: "Made for real life" },
        ].map((item) => (
          <View key={item.title} style={w.feature}>
            <Icon name={item.icon as "target"} color={p.green} size={19} />
            <Text style={w.featureText}>{item.title}</Text>
          </View>
        ))}
      </View>
      <Button
        title="Start your journey"
        onPress={() => router.push("/register")}
      />
      <View style={w.login}>
        <Text style={w.loginText}>Already part of BodyIQ?</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/login")}
          style={w.loginLink}
        >
          <Text style={w.loginLinkText}>Sign in</Text>
          <Icon name="arrow-right" color={p.green} size={13} />
        </Pressable>
      </View>
      <Button
        title="Explore the design preview"
        onPress={enter}
        secondary
        icon="compass"
      />
      <Text style={w.note}>
        Explore with clearly labeled sample data. Real AI coaching, food
        recognition, and fitness tracking are coming in future phases.
      </Text>
      <View style={w.footer}>
        <Text style={w.footerText}>YOUR BODY. YOUR GOALS. YOUR AI COACH.</Text>
      </View>
    </Screen>
  );
}
const w = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
    gap: 12,
  },
  hero: {
    minHeight: 365,
    backgroundColor: p.surface,
    overflow: "hidden",
    borderRadius: 26,
    marginBottom: 28,
  },
  tint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00000028",
  },
  heroContent: { padding: 24, minHeight: 365, justifyContent: "space-between" },
  heroTag: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroTagText: { color: "#D6DDD2", fontSize: 8, letterSpacing: 1 },
  heroTitle: {
    color: p.text,
    fontSize: 44,
    lineHeight: 49,
    fontWeight: "700",
    letterSpacing: -1.8,
    marginVertical: 30,
  },
  heroFoot: { flexDirection: "row", alignItems: "center", gap: 8 },
  line: { width: 22, height: 2, backgroundColor: p.green },
  heroFootText: { color: "#D6DDD2", fontSize: 8, letterSpacing: 1 },
  title: {
    color: p.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "600",
    letterSpacing: -0.8,
    marginBottom: 14,
  },
  features: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 13,
    marginTop: 26,
    marginBottom: 30,
  },
  feature: { flex: 1, gap: 10 },
  featureText: { color: p.muted, fontSize: 10, lineHeight: 17 },
  login: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginVertical: 11,
  },
  loginText: { color: p.muted, fontSize: 12 },
  loginLink: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  loginLinkText: { color: p.green, fontSize: 12, fontWeight: "600" },
  note: {
    color: p.muted,
    fontSize: 10,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: p.border,
    marginTop: 30,
    paddingTop: 20,
  },
  footerText: {
    color: "#687469",
    textAlign: "center",
    fontSize: 8,
    letterSpacing: 1.5,
  },
});
