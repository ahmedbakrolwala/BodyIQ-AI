import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { BackHeader } from "@/components/bodyiq/premium";
import {
  Body,
  Button,
  Card,
  Icon,
  Label,
  Screen,
  Section,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import type { FitnessInput, FitnessPlan } from "@/shared/fitness";

function format(value: number, digits = 1) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(digits).replace(/\.0+$/, "");
}
function profileMeasurements(profile: FitnessInput) {
  if (profile.units === "metric") {
    return {
      height: `${format(profile.heightCm)} cm`,
      weight: `${format(profile.weightKg)} kg`,
      target:
        profile.targetWeightKg === null
          ? "No target"
          : `${format(profile.targetWeightKg)} kg`,
    };
  }
  return {
    height: `${format(profile.heightCm / 2.54)} in`,
    weight: `${format(profile.weightKg * 2.2046226218)} lb`,
    target:
      profile.targetWeightKg === null
        ? "No target"
        : `${format(profile.targetWeightKg * 2.2046226218)} lb`,
  };
}
const goalLabels: Record<FitnessInput["primaryGoal"], string> = {
  muscle_gain: "Build muscle",
  fat_loss: "Lose fat",
  maintenance: "Maintain weight",
  strength: "Build strength",
  general_fitness: "General fitness",
};
const experienceLabels: Record<FitnessInput["experience"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
const activityLabels: Record<FitnessInput["activityLevel"], string> = {
  sedentary: "Mostly sedentary",
  lightly_active: "Lightly active",
  moderately_active: "Moderately active",
  very_active: "Very active",
};
const dietLabels: Record<FitnessInput["dietaryPreference"], string> = {
  omnivore: "Omnivore",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
  eggetarian: "Eggetarian",
};
const equipmentLabels: Record<FitnessInput["equipment"][number], string> = {
  bodyweight: "Bodyweight",
  dumbbells: "Dumbbells",
  barbell: "Barbell",
  bench: "Bench",
  resistance_bands: "Resistance bands",
  treadmill: "Treadmill",
  stationary_bike: "Stationary bike",
  pullup_bar: "Pull-up bar",
  kettlebell: "Kettlebell",
};
const allergyLabels: Record<string, string> = {
  dairy: "Dairy",
  eggs: "Eggs",
  fish: "Fish",
  shellfish: "Shellfish",
  peanuts: "Peanuts",
  tree_nuts: "Tree nuts",
  wheat: "Wheat",
  soy: "Soy",
  sesame: "Sesame",
};

export default function FitnessProfileScreen() {
  const auth = useAuth();
  const query = trpc.fitness.get.useQuery(undefined, {
    enabled: auth.isAuthenticated,
    retry: false,
  });

  if (auth.loading || query.isLoading) {
    return (
      <Screen preview={false}>
        <BackHeader title="Fitness profile" />
        <View style={styles.centerState}>
          <ActivityIndicator color={p.green} />
          <Body style={{ marginTop: 14 }}>Loading your saved profile…</Body>
        </View>
      </Screen>
    );
  }
  if (!auth.isAuthenticated) {
    return (
      <Screen preview={false}>
        <BackHeader title="Fitness profile" />
        <Card>
          <Icon name="lock" color={p.green} size={26} />
          <Text style={styles.emptyTitle}>Sign in to view your profile.</Text>
          <Body style={{ marginTop: 9, marginBottom: 20 }}>
            Your fitness data belongs to your authenticated account. We do not
            display guest health records.
          </Body>
          <Button
            title="Sign in securely"
            onPress={() => router.push("/login")}
            icon="lock"
          />
        </Card>
      </Screen>
    );
  }
  if (query.isError) {
    return (
      <Screen preview={false}>
        <BackHeader title="Fitness profile" />
        <Card>
          <Text style={styles.emptyTitle}>We couldn’t load your profile.</Text>
          <Body style={{ marginTop: 9, marginBottom: 18 }}>
            Your saved data has not been changed. Check your connection and try
            again.
          </Body>
          <Button
            title="Retry loading profile"
            onPress={() => void query.refetch()}
            icon="refresh-cw"
          />
        </Card>
      </Screen>
    );
  }
  if (!query.data) {
    return (
      <Screen preview={false}>
        <BackHeader title="Fitness profile" />
        <Card>
          <Icon name="activity" color={p.green} size={26} />
          <Text style={styles.emptyTitle}>Your profile is ready to begin.</Text>
          <Body style={{ marginTop: 9, marginBottom: 20 }}>
            Complete five short steps to unlock personal training and nutrition
            guidance.
          </Body>
          <Button
            title="Start fitness profile"
            onPress={() => router.push("/onboarding")}
            icon="arrow-right"
          />
        </Card>
      </Screen>
    );
  }

  return <SavedProfile plan={query.data} />;
}

function SavedProfile({ plan }: { plan: FitnessPlan }) {
  const { profile } = plan;
  const measurements = profileMeasurements(profile);
  const allergyText = profile.allergies.length
    ? profile.allergies.map((item) => allergyLabels[item] ?? item).join(", ")
    : "None recorded";
  const equipmentText = profile.equipment
    .map((item) => equipmentLabels[item])
    .join(", ");
  return (
    <Screen preview={false}>
      <BackHeader title="Fitness profile" badge="SAVED" />
      <Text style={styles.heading}>Your baseline, in one place.</Text>
      <Body style={{ marginBottom: 20 }}>
        Review the details BodyIQ uses for your private recommendations.
      </Body>
      <Button
        title="Edit all profile details"
        secondary
        onPress={() => router.push("/onboarding?edit=true")}
        icon="edit-2"
      />

      <Section title="Basics" />
      <Card>
        <Detail label="Age" value={`${profile.age} years`} />
        <Detail label="Height" value={measurements.height} />
        <Detail label="Current weight" value={measurements.weight} />
        <Detail label="Target weight" value={measurements.target} last />
      </Card>

      <Section title="Goals and training" />
      <Card>
        <Detail label="Primary goal" value={goalLabels[profile.primaryGoal]} />
        <Detail
          label="Experience"
          value={experienceLabels[profile.experience]}
        />
        <Detail
          label="Activity"
          value={activityLabels[profile.activityLevel]}
        />
        <Detail
          label="Location"
          value={profile.workoutLocation === "gym" ? "Gym" : "Home"}
        />
        <Detail label="Equipment" value={equipmentText || "Bodyweight"} last />
      </Card>

      <Section title="Food preferences" />
      <Card>
        <Detail label="Diet" value={dietLabels[profile.dietaryPreference]} />
        <Detail label="Allergies / avoidances" value={allergyText} last />
      </Card>

      <Section title="Estimated targets" />
      <TargetCard plan={plan} />

      <Section title="Use your profile" />
      <View style={styles.linkStack}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/nutrition")}
          style={styles.linkCard}
        >
          <View style={styles.linkIcon}>
            <Icon name="pie-chart" color={p.green} size={19} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Open nutrition</Text>
            <Body style={styles.linkBody}>
              See meal ideas shaped by your diet and allergies.
            </Body>
          </View>
          <Icon name="chevron-right" size={18} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/workouts")}
          style={styles.linkCard}
        >
          <View style={styles.linkIcon}>
            <Icon name="activity" color={p.green} size={19} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Open workouts</Text>
            <Body style={styles.linkBody}>
              See training guidance shaped by your experience and equipment.
            </Body>
          </View>
          <Icon name="chevron-right" size={18} />
        </Pressable>
      </View>
      <View style={styles.privacy}>
        <Icon name="shield" color={p.green} size={14} />
        <Body style={{ flex: 1, fontSize: 10 }}>
          Only your authenticated BodyIQ account can access these details.
        </Body>
      </View>
    </Screen>
  );
}

function TargetCard({ plan }: { plan: FitnessPlan }) {
  const { targets, profile } = plan;
  if (!profile.estimateEligible || targets.calories === null) {
    return (
      <Card style={{ borderColor: p.border }}>
        <View style={styles.targetHeader}>
          <Icon name="info" color={p.green} size={17} />
          <Text style={styles.targetTitle}>Estimates are turned off</Text>
        </View>
        <Body style={{ marginTop: 8 }}>{targets.note}</Body>
        <Body style={{ marginTop: 10, fontSize: 11 }}>
          You can still save and use your profile for general training and meal
          guidance.
        </Body>
      </Card>
    );
  }
  return (
    <Card style={{ borderColor: p.greenDark }}>
      <View style={styles.targetHeader}>
        <Icon name="target" color={p.green} size={17} />
        <Text style={styles.targetTitle}>Conservative daily estimate</Text>
      </View>
      <Text style={styles.calories}>
        {targets.calories}
        <Text style={styles.calorieUnit}> kcal</Text>
      </Text>
      <View style={styles.macroRow}>
        <Metric label="Protein" value={targets.proteinG} unit="g" />
        <Metric label="Carbs" value={targets.carbsG} unit="g" />
        <Metric label="Fat" value={targets.fatG} unit="g" />
      </View>
      {targets.maintenanceLow !== null && targets.maintenanceHigh !== null ? (
        <Body style={styles.range}>
          Maintenance range: {targets.maintenanceLow}–{targets.maintenanceHigh}{" "}
          kcal
        </Body>
      ) : null}
      <Body style={{ marginTop: 10, fontSize: 11 }}>{targets.note}</Body>
    </Card>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Label>{label.toUpperCase()}</Label>
      <Text style={styles.metric}>
        {value === null ? "—" : value}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
    </View>
  );
}
function Detail({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detail, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerState: { alignItems: "center", paddingVertical: 60 },
  heading: {
    color: p.text,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
    marginBottom: 9,
  },
  emptyTitle: { color: p.text, fontSize: 21, fontWeight: "700", marginTop: 14 },
  detail: {
    borderBottomWidth: 1,
    borderBottomColor: p.border,
    paddingVertical: 13,
    gap: 5,
  },
  detailLabel: {
    color: p.muted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  detailValue: { color: p.text, fontSize: 14, lineHeight: 20 },
  targetHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  targetTitle: { color: p.text, fontSize: 15, fontWeight: "700" },
  calories: { color: p.green, fontSize: 33, fontWeight: "700", marginTop: 16 },
  calorieUnit: { color: p.muted, fontSize: 12, fontWeight: "500" },
  macroRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  metric: { color: p.text, fontSize: 19, fontWeight: "700", marginTop: 5 },
  metricUnit: { color: p.muted, fontSize: 10, fontWeight: "500" },
  range: { color: p.muted, fontSize: 11, marginTop: 16 },
  linkStack: { gap: 10 },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 76,
    padding: 14,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 15,
  },
  linkIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: p.greenDark,
    justifyContent: "center",
    alignItems: "center",
  },
  linkTitle: { color: p.text, fontSize: 13, fontWeight: "700" },
  linkBody: { color: p.muted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  privacy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 22,
    marginBottom: 12,
  },
});
