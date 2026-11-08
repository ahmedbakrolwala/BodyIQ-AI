import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import { ActivityRing } from "@/components/bodyiq/charts";
import {
  Badge,
  Body,
  Card,
  Header,
  Icon,
  IconName,
  Label,
  PreviewNotice,
  Screen,
  Section,
} from "@/components/bodyiq/ui";
import { Meter, MiniStat } from "@/components/bodyiq/premium";
import { palette as p } from "@/constants/design";
import { useDesignPreview } from "@/lib/preview-context";
import { sampleDay as d } from "@/lib/sample-data";
import { trpc } from "@/lib/trpc";

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const wide = width > 720;
  const { isPreview } = useDesignPreview();
  const status = trpc.foundation.status.useQuery(undefined, {
    staleTime: 60000,
  });
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
  return (
    <Screen>
      <Header
        home
        title="Make today count."
        eyebrow={
          isPreview
            ? "Good morning, Alex · Sample profile"
            : "A fresh start. A stronger tomorrow."
        }
      />
      <View style={h.week}>
        {days.map((date, i) => {
          const active = date.toDateString() === today.toDateString();
          return (
            <View
              key={i}
              accessible
              accessibilityLabel={`${date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric" })}${active ? ", today" : ""}`}
              style={[h.day, active && { backgroundColor: p.green }]}
            >
              <Text style={[h.dayName, active && { color: p.background }]}>
                {["M", "T", "W", "T", "F", "S", "S"][i]}
              </Text>
              <Text style={[h.dayNumber, active && { color: p.background }]}>
                {date.getDate()}
              </Text>
              <View
                style={[
                  h.dot,
                  {
                    backgroundColor: active
                      ? p.background
                      : isPreview && [0, 2, 3, 5].includes(i)
                        ? p.green
                        : "transparent",
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/profile")}
        style={({ pressed }) => [h.goal, { opacity: pressed ? 0.8 : 1 }]}
      >
        <View style={h.goalIcon}>
          <Icon name="target" color={p.green} size={23} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={h.goalTitle}>
            {isPreview
              ? "Your goal: a little stronger."
              : "Your journey starts with you."}
          </Text>
          <Body style={{ fontSize: 11 }}>
            {isPreview
              ? "Sample goal · Build strength, build consistency"
              : "Set your real goal in your secure profile."}
          </Body>
        </View>
        <Icon name="arrow-up-right" color={p.green} size={19} />
      </Pressable>
      <View style={[h.columns, wide && { flexDirection: "row", gap: 20 }]}>
        <View style={{ flex: 1 }}>
          <Section title="Today’s activity" />
          <Card>
            <View style={h.between}>
              <Label>DAILY MOVEMENT</Label>
              <Badge text={isPreview ? "70% OF SAMPLE GOAL" : "FRESH START"} />
            </View>
            <View style={h.activity}>
              <ActivityRing
                value={isPreview ? d.activeKcal : undefined}
                goal={isPreview ? d.activeGoal : 0}
                label={isPreview ? "of 600 kcal goal" : "No activity yet"}
                unit={isPreview ? "kcal burned" : undefined}
                size={width < 355 ? 125 : 145}
              />
              <View style={{ flex: 1, gap: 17 }}>
                {[
                  {
                    label: "Movement",
                    value: isPreview ? "420" : "—",
                    unit: "kcal",
                    icon: "zap",
                    color: p.green,
                  },
                  {
                    label: "Training",
                    value: isPreview ? "35" : "—",
                    unit: "min",
                    icon: "activity",
                    color: p.lavender,
                  },
                  {
                    label: "Steps",
                    value: isPreview ? "6,840" : "—",
                    unit: "steps",
                    icon: "navigation",
                    color: p.blue,
                  },
                ].map((item) => (
                  <View key={item.label} style={h.activityRow}>
                    <Icon
                      name={item.icon as IconName}
                      color={item.color}
                      size={15}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={h.metricName}>{item.label}</Text>
                      <Text style={h.metric}>
                        {item.value}
                        <Text style={h.unit}> {item.unit}</Text>
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <View style={h.divider} />
            <View style={h.foot}>
              <Icon name="sun" color={p.green} size={13} />
              <Text style={h.footText}>
                {isPreview
                  ? "Small wins add up. Keep your rhythm."
                  : "A blank canvas. A stronger tomorrow."}
              </Text>
            </View>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Section
            title="Fuel your day"
            action="View nutrition"
            onPress={() => router.push("/(tabs)/nutrition")}
          />
          <Card>
            <View style={h.between}>
              <Label>DAILY NUTRITION</Label>
              <Icon name="pie-chart" color={p.orange} size={18} />
            </View>
            <View style={h.calorieRow}>
              <Text style={h.calories}>
                {isPreview ? "1,680" : "—"}
                <Text style={h.calorieUnit}> kcal</Text>
              </Text>
              <Text style={h.goalCaption}>
                {isPreview ? "of 2,200 kcal" : "Goal not set"}
              </Text>
            </View>
            <Meter
              value={isPreview ? d.calories : 0}
              goal={isPreview ? d.calorieGoal : 0}
            />
            <Text style={h.remaining}>
              {isPreview
                ? "520 kcal remaining · Sample"
                : "Your calorie goal will appear here"}
            </Text>
            <View style={h.macros}>
              {[
                {
                  label: "Protein",
                  value: d.protein.value,
                  goal: d.protein.goal,
                  color: p.green,
                },
                {
                  label: "Carbs",
                  value: d.carbs.value,
                  goal: d.carbs.goal,
                  color: p.lavender,
                },
                {
                  label: "Fats",
                  value: d.fats.value,
                  goal: d.fats.goal,
                  color: p.orange,
                },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, gap: 9 }}>
                  <Text style={h.macroLabel}>{item.label}</Text>
                  <Text style={h.macroValue}>
                    {isPreview ? item.value : "—"}
                    <Text style={h.unit}> g</Text>
                  </Text>
                  <Meter
                    value={isPreview ? item.value : 0}
                    goal={isPreview ? item.goal : 0}
                    color={item.color}
                    height={3}
                  />
                </View>
              ))}
            </View>
          </Card>
        </View>
      </View>
      <View style={h.stats}>
        <MiniStat
          icon="navigation"
          title="Daily steps"
          value={isPreview ? "6,840" : "—"}
          unit="steps"
          color={p.blue}
        />
        <MiniStat
          icon="droplet"
          title="Stay hydrated"
          value={isPreview ? "1.75" : "—"}
          unit="L"
          color={p.lavender}
        />
      </View>
      <Section
        title="Your next move"
        action="All workouts"
        onPress={() => router.push("/(tabs)/workouts")}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explore full body strength workout preview"
        onPress={() => router.push("/(tabs)/workouts")}
      >
        <ImageBackground
          source={require("@/assets/images/training.jpg")}
          style={h.workout}
          imageStyle={{ borderRadius: 22, width: "100%", height: "100%" }}
        >
          <View style={h.tint} />
          <View style={h.workoutContent}>
            <Badge
              text={
                isPreview ? "RECOMMENDED · SAMPLE" : "WORKOUTS · COMING NEXT"
              }
            />
            <Text style={h.workoutTitle}>Strength for{"\n"}real life.</Text>
            <View style={h.workoutMeta}>
              <Icon name="clock" color={p.text} size={12} />
              <Text style={h.workoutSub}>
                {isPreview
                  ? "35 min · Full body · Intermediate"
                  : "Your future training space"}
              </Text>
            </View>
          </View>
          <View style={h.workoutArrow}>
            <Icon name="arrow-up-right" color={p.background} />
          </View>
        </ImageBackground>
      </Pressable>
      <Section title="A smarter fitness space" />
      <View style={h.shortcuts}>
        {[
          {
            icon: "camera",
            text: "Scan food",
            href: "/scanner",
            color: p.orange,
          },
          {
            icon: "bar-chart-2",
            text: "Progress",
            href: "/(tabs)/progress",
            color: p.blue,
          },
          {
            icon: "zap",
            text: "AI Coach",
            href: "/(tabs)/coach",
            color: p.green,
          },
        ].map((item) => (
          <Pressable
            key={item.text}
            accessibilityRole="button"
            onPress={() => router.push(item.href as "/scanner")}
            style={({ pressed }) => [
              h.shortcut,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Icon name={item.icon as IconName} color={item.color} size={22} />
            <Text style={h.shortcutText}>{item.text}</Text>
            <Icon name="arrow-right" size={13} />
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(tabs)/coach")}
        style={h.insight}
      >
        <Icon name="zap" color={p.green} size={20} />
        <View style={{ flex: 1 }}>
          <Label>BODYIQ INTELLIGENCE</Label>
          <Text style={h.insightText}>
            Big changes begin with small habits.
          </Text>
          <Body style={{ fontSize: 10 }}>
            Explore the future of personal coaching.
          </Body>
        </View>
        <Icon name="chevron-right" size={17} />
      </Pressable>
      <View style={h.status}>
        <View
          style={[
            h.dot,
            {
              backgroundColor: status.data?.databaseReachable
                ? p.green
                : p.muted,
            },
          ]}
        />
        <Text style={h.statusText}>
          {status.data?.databaseReachable
            ? "BODYIQ CLOUD CONNECTED"
            : "CONNECTING TO BODYIQ CLOUD"}
        </Text>
      </View>
      <PreviewNotice>
        All fitness values shown in Design Preview are illustrative. Only your
        signed-in basic profile is stored in the cloud.
      </PreviewNotice>
    </Screen>
  );
}
const h = StyleSheet.create({
  week: { flexDirection: "row", gap: 6, marginBottom: 22 },
  day: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#131713",
    borderRadius: 15,
    paddingVertical: 11,
    gap: 7,
  },
  dayName: { color: p.muted, fontSize: 10 },
  dayNumber: { color: p.text, fontSize: 16, fontWeight: "600" },
  dot: { width: 4, height: 4, borderRadius: 4 },
  goal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#C3FF5C24",
    backgroundColor: "#192113",
  },
  goalIcon: {
    height: 43,
    width: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C3FF5C0D",
  },
  goalTitle: {
    color: p.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  columns: { gap: 0 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  activity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginVertical: 20,
  },
  activityRow: { flexDirection: "row", gap: 9, alignItems: "center" },
  metricName: { color: p.muted, fontSize: 10, marginBottom: 5 },
  metric: { color: p.text, fontSize: 18, fontWeight: "600" },
  unit: { color: p.muted, fontSize: 10, fontWeight: "400" },
  divider: { height: 1, backgroundColor: p.border },
  foot: { flexDirection: "row", gap: 7, alignItems: "center", marginTop: 13 },
  footText: { color: p.muted, fontSize: 10 },
  calorieRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 28,
    marginBottom: 20,
  },
  calories: {
    color: p.text,
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: -0.8,
  },
  calorieUnit: { color: p.muted, fontSize: 11, fontWeight: "400" },
  goalCaption: { color: p.muted, fontSize: 10 },
  remaining: { color: p.muted, fontSize: 10, marginTop: 10 },
  macros: { flexDirection: "row", gap: 16, marginTop: 25, paddingBottom: 12 },
  macroLabel: { color: p.muted, fontSize: 10 },
  macroValue: { color: p.text, fontSize: 18, fontWeight: "500" },
  stats: { flexDirection: "row", gap: 12, marginTop: 16 },
  workout: {
    height: 230,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: p.surface,
  },
  tint: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#00000028",
  },
  workoutContent: { padding: 24, gap: 14 },
  workoutTitle: {
    color: p.text,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "600",
    letterSpacing: -1,
  },
  workoutMeta: { flexDirection: "row", gap: 6, alignItems: "center" },
  workoutSub: { color: "#CDD5C9", fontSize: 10 },
  workoutArrow: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: p.green,
  },
  shortcuts: { flexDirection: "row", gap: 10 },
  shortcut: {
    flex: 1,
    gap: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.surface,
    padding: 16,
  },
  shortcutText: { color: p.text, fontSize: 11, fontWeight: "500" },
  insight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#C3FF5C20",
    backgroundColor: "#151D11",
    padding: 18,
    marginTop: 24,
  },
  insightText: {
    color: p.text,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
    marginBottom: 4,
  },
  status: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 28 },
  statusText: { color: p.muted, fontSize: 8, letterSpacing: 0.8 },
});
