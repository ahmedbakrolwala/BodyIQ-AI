import {
  ImageBackground,
  Platform,
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
import { palette as p, trainingImage } from "@/constants/design";
import { trpc } from "@/lib/trpc";

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const wide = width > 720;
  const status = trpc.foundation.status.useQuery(undefined, {
    staleTime: 60000,
  });
  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
  return (
    <Screen>
      <Header home title="A little better. Every day." eyebrow={dateLabel} />
      <View style={h.week}>
        {days.map((date, i) => {
          const active = date.toDateString() === today.toDateString();
          return (
            <View
              key={i}
              accessible
              accessibilityLabel={`${date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric" })}${active ? ", today" : ""}`}
              style={[h.day, active && h.dayActive]}
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
                  { backgroundColor: active ? p.background : "transparent" },
                ]}
              />
            </View>
          );
        })}
      </View>
      <Pressable
        onPress={() => router.push("/profile")}
        accessibilityRole="button"
        accessibilityLabel="Set up your fitness profile"
        style={({ pressed }) => [h.setup, { opacity: pressed ? 0.8 : 1 }]}
      >
        <View style={h.setupIcon}>
          <Icon name="target" color={p.green} size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={h.setupTitle}>Your journey starts with you.</Text>
          <Body style={{ fontSize: 11, lineHeight: 18 }}>
            Set your goal. Make this space yours.
          </Body>
        </View>
        <Icon name="arrow-up-right" color={p.green} size={20} />
      </Pressable>
      <View style={[h.columns, wide && { flexDirection: "row", gap: 20 }]}>
        <View style={{ flex: 1 }}>
          <Section title="Today’s overview" />
          <Card>
            <View style={h.cardHeader}>
              <Label>DAILY ACTIVITY</Label>
              <Badge text="FRESH START" />
            </View>
            <View style={h.overview}>
              <ActivityRing size={width < 355 ? 110 : 134} />
              <View style={{ flex: 1, gap: 18 }}>
                {[
                  {
                    icon: "zap",
                    title: "Movement",
                    unit: "kcal",
                    color: p.green,
                  },
                  {
                    icon: "activity",
                    title: "Training",
                    unit: "min",
                    color: p.lavender,
                  },
                  {
                    icon: "navigation",
                    title: "Steps",
                    unit: "steps",
                    color: p.blue,
                  },
                ].map((item) => (
                  <View key={item.title} style={h.activityRow}>
                    <Icon
                      name={item.icon as IconName}
                      size={16}
                      color={item.color}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={h.activityName}>{item.title}</Text>
                    </View>
                    <Text style={h.metric}>
                      — <Text style={h.unit}>{item.unit}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={h.divider} />
            <View style={h.cardFoot}>
              <Icon name="sun" size={13} color={p.green} />
              <Text style={h.footText}>
                A blank canvas. A stronger tomorrow.
              </Text>
            </View>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Section
            title="Fuel your day"
            action="Nutrition"
            onPress={() => router.push("/(tabs)/nutrition")}
          />
          <Card>
            <View style={h.cardHeader}>
              <Label>DAILY NUTRITION</Label>
              <Icon name="pie-chart" color={p.orange} size={16} />
            </View>
            <View style={h.calories}>
              <Text style={h.calorieValue}>
                —<Text style={h.calorieUnit}> kcal</Text>
              </Text>
              <Text style={h.calorieCaption}>
                Your calorie goal will appear here
              </Text>
            </View>
            <View style={h.track}>
              <View
                style={{
                  width: 6,
                  height: 5,
                  borderRadius: 4,
                  backgroundColor: p.green,
                }}
              />
            </View>
            <View style={h.macros}>
              {[
                { label: "Protein", color: p.green },
                { label: "Carbs", color: p.lavender },
                { label: "Fats", color: p.orange },
              ].map((macro) => (
                <View key={macro.label} style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: macro.color,
                      }}
                    />
                    <Text style={h.macroLabel}>{macro.label}</Text>
                  </View>
                  <Text style={h.macroValue}>
                    — <Text style={h.unit}>g</Text>
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </View>
      <Section
        title="Find your rhythm"
        action="View workouts"
        onPress={() => router.push("/(tabs)/workouts")}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explore upcoming workout plans"
        onPress={() => router.push("/(tabs)/workouts")}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <ImageBackground
          source={
            Platform.OS === "web"
              ? { uri: trainingImage }
              : require("@/assets/images/training.jpg")
          }
          style={h.workout}
          imageStyle={{ borderRadius: 20 }}
        >
          <View style={h.workoutTint} />
          <View style={h.workoutContent}>
            <Badge text="WORKOUTS · COMING NEXT" />
            <Text style={h.workoutTitle}>Strength for{"\n"}real life.</Text>
            <Text style={h.workoutSub}>Your future training space</Text>
          </View>
          <View style={h.workoutArrow}>
            <Icon name="arrow-up-right" color={p.background} />
          </View>
        </ImageBackground>
      </Pressable>
      <Section title="Your fitness, connected" />
      <View style={h.shortcuts}>
        {[
          {
            icon: "pie-chart",
            text: "Nutrition",
            href: "/(tabs)/nutrition",
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
            onPress={() => router.push(item.href as "/(tabs)/nutrition")}
            style={({ pressed }) => [
              h.shortcut,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Icon name={item.icon as IconName} color={item.color} size={22} />
            <Text style={h.shortcutText}>{item.text}</Text>
            <Icon name="arrow-right" size={12} />
          </Pressable>
        ))}
      </View>
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
          {status.isLoading
            ? "Connecting to BodyIQ Cloud…"
            : status.data?.databaseReachable
              ? "BODYIQ CLOUD CONNECTED"
              : "CLOUD CONNECTION UNAVAILABLE"}
        </Text>
        <Text style={h.version}>PHASE 01</Text>
      </View>
      <PreviewNotice />
    </Screen>
  );
}
const h = StyleSheet.create({
  week: { flexDirection: "row", gap: 6, marginBottom: 22 },
  day: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 11,
    gap: 7,
    backgroundColor: "#111411",
  },
  dayActive: { backgroundColor: p.green },
  dayName: { color: p.muted, fontSize: 10 },
  dayNumber: { color: p.text, fontSize: 15, fontWeight: "600" },
  dot: { width: 4, height: 4, borderRadius: 4 },
  setup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#C3FF5C28",
    backgroundColor: "#182014",
  },
  setupIcon: {
    height: 42,
    width: 42,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#C3FF5C10",
  },
  setupTitle: {
    color: p.text,
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 3,
  },
  columns: { gap: 0 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  overview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 15,
    marginBottom: 12,
  },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  activityName: { color: p.muted, fontSize: 11 },
  metric: { color: p.text, fontSize: 15, fontWeight: "600" },
  unit: { color: p.muted, fontSize: 9, fontWeight: "400" },
  divider: { height: 1, backgroundColor: p.border },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
  },
  footText: { color: p.muted, fontSize: 10 },
  calories: { marginTop: 24, marginBottom: 20 },
  calorieValue: { color: p.text, fontSize: 32, fontWeight: "600" },
  calorieUnit: { color: p.muted, fontSize: 12, fontWeight: "400" },
  calorieCaption: { color: p.muted, fontSize: 10, marginTop: 7 },
  track: { height: 5, borderRadius: 4, backgroundColor: p.border },
  macros: { flexDirection: "row", marginTop: 22, paddingBottom: 8 },
  macroLabel: { color: p.muted, fontSize: 10 },
  macroValue: { color: p.text, fontSize: 16, marginTop: 8 },
  workout: {
    height: 214,
    backgroundColor: p.surface,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
  },
  workoutTint: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#00000030",
  },
  workoutContent: { padding: 22, gap: 10 },
  workoutTitle: {
    color: p.text,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "600",
    letterSpacing: -0.8,
  },
  workoutSub: { color: "#C2C9C2", fontSize: 11 },
  workoutArrow: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: p.green,
    borderRadius: 12,
  },
  shortcuts: { flexDirection: "row", gap: 10 },
  shortcut: {
    flex: 1,
    backgroundColor: p.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: p.border,
    padding: 16,
    gap: 14,
  },
  shortcutText: { color: p.text, fontSize: 11, fontWeight: "500" },
  status: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 28 },
  statusText: { color: p.muted, fontSize: 8, letterSpacing: 0.8, flex: 1 },
  version: { color: p.muted, fontSize: 8, letterSpacing: 1 },
});
