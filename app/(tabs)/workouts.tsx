import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Badge,
  Body,
  Card,
  EmptyState,
  Header,
  Icon,
  IconName,
  PreviewNotice,
  Screen,
  Section,
  Segmented,
} from "@/components/bodyiq/ui";
import { RoadmapModal } from "@/components/bodyiq/roadmap-modal";
import { palette as p } from "@/constants/design";

const concepts = [
  {
    title: "Build your foundation",
    category: "Strength",
    icon: "activity",
    color: p.green,
    subtitle: "Move with purpose. Get stronger over time.",
    description:
      "A future space for progressive strength plans, exercise guidance, and workout logging adapted to your experience.",
  },
  {
    title: "Find your second wind",
    category: "Cardio",
    icon: "wind",
    color: p.blue,
    subtitle: "Create room for a little more endurance.",
    description:
      "Future cardio sessions will help organize your training. Personalized plans and session tracking are not available in Phase 1.",
  },
  {
    title: "Move a little freer",
    category: "Mobility",
    icon: "sun",
    color: p.lavender,
    subtitle: "Make space for recovery and movement.",
    description:
      "A future library for mobility and recovery sessions. No exercise prescription or personalized recovery advice is generated yet.",
  },
] as const;
export default function WorkoutsScreen() {
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<(typeof concepts)[number] | null>(
    null,
  );
  return (
    <Screen>
      <Header title="Made to move." eyebrow="WORKOUTS" />
      <Body style={{ marginBottom: 24 }}>
        Your future home for purposeful training, at your own pace.
      </Body>
      <Card style={w.featured}>
        <Badge text="YOUR TRAINING SPACE" />
        <Text style={w.headline}>
          Show up for{"\n"}
          <Text style={{ color: p.green }}>yourself.</Text>
        </Text>
        <View style={w.bottom}>
          <Body style={{ flex: 1, fontSize: 12 }}>
            Smart plans. Meaningful movement.{"\n"}Coming in a future phase.
          </Body>
          <View style={w.mark}>
            <Icon name="activity" color={p.green} size={32} />
          </View>
        </View>
      </Card>
      <Section title="Explore the possibilities" />
      <Segmented
        options={["All", "Strength", "Cardio", "Mobility"]}
        value={category}
        onChange={setCategory}
      />
      <View style={{ gap: 12 }}>
        {concepts
          .filter((item) => category === "All" || item.category === category)
          .map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${item.category} concept`}
              onPress={() => setSelected(item)}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Card style={{ padding: 18 }}>
                <View style={w.cardTop}>
                  <View
                    style={[
                      w.conceptIcon,
                      { backgroundColor: item.color + "15" },
                    ]}
                  >
                    <Icon
                      name={item.icon as IconName}
                      color={item.color}
                      size={23}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: item.color,
                        fontSize: 9,
                        letterSpacing: 1.4,
                        fontWeight: "600",
                      }}
                    >
                      {item.category.toUpperCase()}
                    </Text>
                    <Text style={w.conceptTitle}>{item.title}</Text>
                  </View>
                  <Icon name="arrow-up-right" size={18} />
                </View>
                <Body style={{ fontSize: 11, marginTop: 16 }}>
                  {item.subtitle}
                </Body>
                <View style={w.conceptBottom}>
                  <Badge text="CONCEPT PREVIEW" color={p.muted} />
                  <Text style={w.preview}>Preview plan</Text>
                </View>
              </Card>
            </Pressable>
          ))}
      </View>
      <Section title="Your recent sessions" />
      <Card>
        <EmptyState
          icon="clock"
          title="Your first session awaits."
          description="Completed workouts will live here once session tracking is available."
        />
      </Card>
      <PreviewNotice>
        No workout plans are being generated or started. Categories and previews
        demonstrate the future interface only.
      </PreviewNotice>
      <RoadmapModal
        visible={!!selected}
        title={selected?.title ?? ""}
        description={selected?.description ?? ""}
        onClose={() => setSelected(null)}
      />
    </Screen>
  );
}
const w = StyleSheet.create({
  featured: {
    backgroundColor: "#182014",
    borderColor: "#C3FF5C22",
    padding: 24,
  },
  headline: {
    color: p.text,
    fontSize: 34,
    fontWeight: "600",
    lineHeight: 39,
    letterSpacing: -1,
    marginTop: 22,
    marginBottom: 22,
  },
  bottom: { flexDirection: "row", alignItems: "center", gap: 16 },
  mark: {
    height: 64,
    width: 64,
    borderWidth: 1,
    borderColor: "#C3FF5C25",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-8deg" }],
  },
  cardTop: { flexDirection: "row", gap: 13, alignItems: "center" },
  conceptIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  conceptTitle: {
    color: p.text,
    fontWeight: "600",
    fontSize: 15,
    marginTop: 6,
  },
  conceptBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: p.border,
    paddingTop: 14,
  },
  preview: { color: p.green, fontSize: 10, fontWeight: "600" },
});
