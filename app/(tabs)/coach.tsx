import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Body,
  Button,
  Card,
  Header,
  Icon,
  IconName,
  PreviewNotice,
  Screen,
  Section,
} from "@/components/bodyiq/ui";
import { RoadmapModal } from "@/components/bodyiq/roadmap-modal";
import { palette as p } from "@/constants/design";

export default function CoachScreen() {
  const [preview, setPreview] = useState(false);
  return (
    <Screen>
      <Header title="A coach in your corner." eyebrow="BODYIQ INTELLIGENCE" />
      <Card style={c.hero}>
        <View style={c.orbitOuter}>
          <View style={c.orbitInner}>
            <View style={c.ai}>
              <Icon name="zap" color={p.green} size={42} />
            </View>
          </View>
          <View style={c.spark} />
        </View>
        <Badge text="AI COACH · COMING NEXT" />
        <Text style={c.title}>
          Fitness that{"\n"}understands{" "}
          <Text style={{ color: p.green }}>you.</Text>
        </Text>
        <Body style={{ textAlign: "center", maxWidth: 320 }}>
          One place to ask, learn, and find your next step. Designed around your
          goals, your routine, and your real life.
        </Body>
      </Card>
      <Section title="A smarter kind of support" />
      <View style={{ gap: 12 }}>
        {[
          {
            icon: "target",
            title: "Your goals, in focus",
            text: "Future coaching that adapts to what matters to you.",
          },
          {
            icon: "pie-chart",
            title: "Food that fits your life",
            text: "A future space for everyday nutrition questions.",
          },
          {
            icon: "activity",
            title: "Movement with meaning",
            text: "Future guidance to help you navigate your training.",
          },
        ].map((item) => (
          <Card key={item.title} style={c.feature}>
            <View style={c.featureIcon}>
              <Icon name={item.icon as IconName} color={p.green} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={c.featureTitle}>{item.title}</Text>
              <Body style={{ fontSize: 11, marginTop: 5 }}>{item.text}</Body>
            </View>
          </Card>
        ))}
      </View>
      <View style={{ marginTop: 24, gap: 12 }}>
        <Button
          title="Explore what’s next"
          onPress={() => setPreview(true)}
          icon="zap"
        />
        <Button
          title="Set your fitness goal"
          secondary
          onPress={() => router.push("/profile")}
          icon="target"
        />
      </View>
      <View style={c.composer} accessibilityLabel="Chat unavailable in Phase 1">
        <Icon name="message-circle" size={18} />
        <Text style={c.composerText}>
          Your conversation starts in a future phase
        </Text>
        <Icon name="lock" size={15} />
      </View>
      <PreviewNotice>
        The AI Coach is not connected to a model yet. No chat, health advice, or
        personalized recommendations are generated. BodyIQ AI is not a medical
        service.
      </PreviewNotice>
      <RoadmapModal
        visible={preview}
        title="Your future AI coach."
        description="Later phases can add secure, server-side AI integration and user-owned conversations. The experience will need clear safety boundaries and will never replace professional medical care."
        onClose={() => setPreview(false)}
      />
    </Screen>
  );
}
const c = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#141A10",
    borderColor: "#C3FF5C22",
    gap: 18,
  },
  orbitOuter: {
    height: 156,
    width: 156,
    borderWidth: 1,
    borderColor: "#C3FF5C12",
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  orbitInner: {
    height: 120,
    width: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "#C3FF5C24",
    alignItems: "center",
    justifyContent: "center",
  },
  ai: {
    height: 80,
    width: 80,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#C3FF5C50",
    backgroundColor: "#C3FF5C10",
    alignItems: "center",
    justifyContent: "center",
  },
  spark: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: p.green,
    position: "absolute",
    top: 28,
    right: 15,
  },
  title: {
    color: p.text,
    fontWeight: "600",
    fontSize: 31,
    letterSpacing: -1,
    textAlign: "center",
    lineHeight: 37,
  },
  feature: { flexDirection: "row", gap: 14, alignItems: "center", padding: 17 },
  featureIcon: {
    height: 43,
    width: 43,
    backgroundColor: p.greenDark,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  featureTitle: { color: p.text, fontSize: 13, fontWeight: "600" },
  composer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    marginTop: 24,
  },
  composerText: { color: p.muted, fontSize: 11, flex: 1 },
});
