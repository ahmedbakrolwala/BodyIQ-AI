import { FitnessPersonalization } from "@/components/bodyiq/fitness-personalization";
import { useState } from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Badge,
  Body,
  Card,
  EmptyState,
  Header,
  Icon,
  IconName,
  Screen,
  Section,
  Segmented,
} from "@/components/bodyiq/ui";
import { RoadmapModal } from "@/components/bodyiq/roadmap-modal";
import { palette as p } from "@/constants/design";
import { sampleWorkouts } from "@/lib/sample-data";
import { useDesignPreview } from "@/lib/preview-context";

type Workout = (typeof sampleWorkouts)[number];

export default function WorkoutsScreen() {
  const { isPreview } = useDesignPreview();
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Workout | null>(null);
  // Adjust transient demo state before committing a changed preview mode.
  const [previousPreview, setPreviousPreview] = useState(isPreview);
  if (previousPreview !== isPreview) {
    setPreviousPreview(isPreview);
    if (!isPreview) {
      setSelected(null);
    }
  }

  const filteredWorkouts = sampleWorkouts.filter(
    (workout) => category === "All" || workout.category === category,
  );

  return (
    <Screen>
      <Header title="Made to move." eyebrow="WORKOUTS" />
      <FitnessPersonalization section="workouts" />
      <Body style={{ marginBottom: 20 }}>
        Your future home for purposeful training, at your own pace.
      </Body>

      <ImageBackground
        source={require("@/assets/images/training.jpg")}
        resizeMode="cover"
        imageStyle={w.heroImage}
        style={w.hero}
      >
        <View style={w.heroShade}>
          <Badge
            text={isPreview ? "DESIGN PREVIEW" : "TRAINING SPACE"}
            color={p.green}
          />
          <Text style={w.headline}>
            Show up for{"\n"}
            <Text style={{ color: p.green }}>yourself.</Text>
          </Text>
          <View style={w.heroBottom}>
            <Body
              color="#D4DDD0"
              style={{ flex: 1, fontSize: 12, lineHeight: 18 }}
            >
              {isPreview
                ? "Sample sessions to explore how your training library could feel."
                : "Your first session will appear here when workout tracking is available."}
            </Body>
            {isPreview && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open sample strength session"
                onPress={() => setSelected(sampleWorkouts[0])}
                style={({ pressed }) => [
                  w.heroAction,
                  { opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <Icon name="arrow-up-right" color={p.background} size={19} />
              </Pressable>
            )}
          </View>
        </View>
      </ImageBackground>

      <Section title="Explore sessions" />
      <Segmented
        options={["All", "Strength", "Cardio", "Mobility"]}
        value={category}
        onChange={setCategory}
      />

      {isPreview ? (
        <View style={{ gap: 11 }}>
          <Body style={w.previewCopy}>
            Illustrative sample sessions · no workout is started or recorded.
          </Body>
          {filteredWorkouts.map((workout) => (
            <Pressable
              key={workout.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${workout.title} sample details`}
              onPress={() => setSelected(workout)}
              style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
            >
              <Card style={w.workoutCard}>
                <View style={w.cardTop}>
                  <View
                    style={[
                      w.workoutIcon,
                      { backgroundColor: `${workout.color}15` },
                    ]}
                  >
                    <Icon
                      name={workout.icon as IconName}
                      color={workout.color}
                      size={22}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[w.category, { color: workout.color }]}>
                      {workout.category.toUpperCase()}
                    </Text>
                    <Text style={w.workoutTitle} numberOfLines={1}>
                      {workout.title}
                    </Text>
                  </View>
                  <Icon name="chevron-right" color={p.muted} size={17} />
                </View>
                <View style={w.metaRow}>
                  <View style={w.meta}>
                    <Icon name="clock" color={p.muted} size={14} />
                    <Text style={w.metaText}>{workout.duration} min</Text>
                  </View>
                  <View style={w.meta}>
                    <Icon name="list" color={p.muted} size={14} />
                    <Text style={w.metaText}>
                      {workout.exercises} exercises
                    </Text>
                  </View>
                  <Badge text="SAMPLE" color={p.muted} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <Card>
          <EmptyState
            icon="activity"
            title="Your training library is empty."
            description="Sample sessions are hidden. Workout plans and completed sessions will appear once tracking is available."
          />
        </Card>
      )}

      <Section title="Your recent sessions" />
      {isPreview ? (
        <Card style={w.recentCard}>
          <View style={w.recentIcon}>
            <Icon name="check" color={p.green} size={19} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={w.recentTitle}>Full body strength</Text>
            <Text style={w.recentSub}>Tuesday · 35 min · sample session</Text>
          </View>
          <Badge text="SAMPLE" color={p.green} />
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon="clock"
            title="Your first session awaits."
            description="Completed workouts will live here once session tracking is available."
          />
        </Card>
      )}

      <Body style={w.footnote}>
        {isPreview
          ? "Design preview only. Nothing here starts a workout, gives exercise prescription, or writes a session."
          : "No workout plans or sessions are active yet."}
      </Body>

      <RoadmapModal
        visible={selected !== null}
        title={selected?.title ?? ""}
        description={
          selected
            ? `${selected.duration} minutes · ${selected.exercises} exercise slots · ${selected.level}. ${selected.description}`
            : ""
        }
        onClose={() => setSelected(null)}
      />
    </Screen>
  );
}

const w = StyleSheet.create({
  hero: {
    minHeight: 226,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#182014",
    borderWidth: 1,
    borderColor: "#C3FF5C28",
  },
  heroImage: { borderRadius: 22, width: "100%", height: "100%" },
  heroShade: {
    flex: 1,
    minHeight: 226,
    justifyContent: "flex-end",
    padding: 21,
    backgroundColor: "#071006A8",
  },
  headline: {
    color: p.text,
    fontSize: 32,
    fontWeight: "600",
    lineHeight: 37,
    letterSpacing: -1,
    marginTop: 18,
    marginBottom: 18,
  },
  heroBottom: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroAction: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: p.green,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCopy: { fontSize: 11, marginBottom: 1 },
  workoutCard: { padding: 16 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  workoutIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  category: { fontSize: 9, letterSpacing: 1.4, fontWeight: "700" },
  workoutTitle: {
    color: p.text,
    fontWeight: "600",
    fontSize: 15,
    marginTop: 5,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: p.border,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { color: p.muted, fontSize: 10 },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: p.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  recentTitle: { color: p.text, fontSize: 13, fontWeight: "600" },
  recentSub: { color: p.muted, fontSize: 10, marginTop: 5 },
  footnote: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 18,
    paddingHorizontal: 2,
  },
});
