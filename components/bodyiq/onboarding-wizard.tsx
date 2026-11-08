import { parseMeasurement as numberValue } from "@/lib/measurement-input";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { AuthField } from "@/components/bodyiq/auth-form";
import {
  Body,
  Button,
  Card,
  Choice,
  Icon,
  Label,
  Section,
} from "@/components/bodyiq/ui";
import { BackHeader } from "@/components/bodyiq/premium";
import { palette as p } from "@/constants/design";
import { trpc } from "@/lib/trpc";
import type { FitnessInput } from "@/shared/fitness";

type Units = FitnessInput["units"];
type EquipmentId = FitnessInput["equipment"][number];
type Experience = FitnessInput["experience"];
type PrimaryGoal = FitnessInput["primaryGoal"];
type ActivityLevel = FitnessInput["activityLevel"];
type WorkoutLocation = FitnessInput["workoutLocation"];
type DietaryPreference = FitnessInput["dietaryPreference"];

type Draft = {
  units: Units;
  age: string;
  height: string;
  weight: string;
  targetWeight: string;
  experience: Experience;
  primaryGoal: PrimaryGoal;
  activityLevel: ActivityLevel;
  workoutLocation: WorkoutLocation;
  equipment: EquipmentId[];
  dietaryPreference: DietaryPreference;
  allergies: string[];
  customAllergies: string;
  estimateEligible: boolean;
};

const STEPS = ["Basics", "Goals", "Activity", "Food", "Review"] as const;
const EQUIPMENT = [
  ["bodyweight", "Bodyweight"],
  ["dumbbells", "Dumbbells"],
  ["barbell", "Barbell"],
  ["bench", "Bench"],
  ["resistance_bands", "Resistance bands"],
  ["treadmill", "Treadmill"],
  ["stationary_bike", "Stationary bike"],
  ["pullup_bar", "Pull-up bar"],
  ["kettlebell", "Kettlebell"],
] as const;
const ALLERGIES = [
  ["dairy", "Dairy"],
  ["eggs", "Eggs"],
  ["fish", "Fish"],
  ["shellfish", "Shellfish"],
  ["peanuts", "Peanuts"],
  ["tree_nuts", "Tree nuts"],
  ["wheat", "Wheat"],
  ["soy", "Soy"],
  ["sesame", "Sesame"],
] as const;

const experienceOptions: { value: Experience; label: string; hint: string }[] =
  [
    {
      value: "beginner",
      label: "Beginner",
      hint: "New or returning to training",
    },
    {
      value: "intermediate",
      label: "Intermediate",
      hint: "Consistent training experience",
    },
    {
      value: "advanced",
      label: "Advanced",
      hint: "Experienced and program-focused",
    },
  ];
const goalOptions: { value: PrimaryGoal; label: string }[] = [
  { value: "muscle_gain", label: "Build muscle" },
  { value: "fat_loss", label: "Lose fat" },
  { value: "maintenance", label: "Maintain my weight" },
  { value: "strength", label: "Build strength" },
  { value: "general_fitness", label: "General fitness" },
];
const activityOptions: { value: ActivityLevel; label: string; hint: string }[] =
  [
    {
      value: "sedentary",
      label: "Mostly sedentary",
      hint: "Desk-based, little intentional movement",
    },
    {
      value: "lightly_active",
      label: "Lightly active",
      hint: "Some walking or light activity",
    },
    {
      value: "moderately_active",
      label: "Moderately active",
      hint: "Training or active movement most weeks",
    },
    {
      value: "very_active",
      label: "Very active",
      hint: "Hard training or active work most days",
    },
  ];
const dietOptions: { value: DietaryPreference; label: string }[] = [
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "eggetarian", label: "Eggetarian" },
];

const emptyDraft: Draft = {
  units: "metric",
  age: "",
  height: "",
  weight: "",
  targetWeight: "",
  experience: "beginner",
  primaryGoal: "general_fitness",
  activityLevel: "moderately_active",
  workoutLocation: "home",
  equipment: ["bodyweight"],
  dietaryPreference: "omnivore",
  allergies: [],
  customAllergies: "",
  estimateEligible: false,
};

function formatNumber(value: number, decimals = 1) {
  return Number.isInteger(value)
    ? String(value)
    : value
        .toFixed(decimals)
        .replace(/\.0+$/, "")
        .replace(/(\.\d*?)0+$/, "$1");
}
function metricValues(draft: Draft) {
  const height = numberValue(draft.height);
  const weight = numberValue(draft.weight);
  const target = numberValue(draft.targetWeight);
  if (draft.units === "metric") {
    return { heightCm: height, weightKg: weight, targetWeightKg: target };
  }
  return {
    heightCm: height === null ? null : height * 2.54,
    weightKg: weight === null ? null : weight / 2.2046226218,
    targetWeightKg: target === null ? null : target / 2.2046226218,
  };
}
function displayProfile(profile: FitnessInput): Draft {
  const units = profile.units;
  return {
    ...emptyDraft,
    units,
    age: String(profile.age),
    height:
      units === "metric"
        ? formatNumber(profile.heightCm)
        : formatNumber(profile.heightCm / 2.54),
    weight:
      units === "metric"
        ? formatNumber(profile.weightKg)
        : formatNumber(profile.weightKg * 2.2046226218),
    targetWeight:
      profile.targetWeightKg === null
        ? ""
        : units === "metric"
          ? formatNumber(profile.targetWeightKg)
          : formatNumber(profile.targetWeightKg * 2.2046226218),
    experience: profile.experience,
    primaryGoal: profile.primaryGoal,
    activityLevel: profile.activityLevel,
    workoutLocation: profile.workoutLocation,
    equipment: profile.equipment,
    dietaryPreference: profile.dietaryPreference,
    allergies: profile.allergies.filter((value) =>
      ALLERGIES.some(([id]) => id === value),
    ),
    customAllergies: profile.allergies
      .filter((value) => !ALLERGIES.some(([id]) => id === value))
      .join(", "),
    estimateEligible: profile.estimateEligible,
  };
}

export function OnboardingWizard({
  initialProfile,
}: {
  initialProfile?: FitnessInput;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    initialProfile ? displayProfile(initialProfile) : emptyDraft,
  );
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const save = trpc.fitness.save.useMutation();
  const utils = trpc.useUtils();
  const isEditing = Boolean(initialProfile);
  const metric = metricValues(draft);

  const setField = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  };
  const toggle = (field: "equipment" | "allergies", value: string) => {
    setDraft((current) => ({
      ...current,
      [field]:
        field === "equipment"
          ? current.equipment.includes(value as EquipmentId)
            ? current.equipment.filter((item) => item !== value)
            : [...current.equipment, value as EquipmentId]
          : current.allergies.includes(value)
            ? current.allergies.filter((item) => item !== value)
            : [...current.allergies, value],
    }));
    setError("");
  };
  const switchUnits = (next: Units) => {
    if (next === draft.units) return;
    const height = numberValue(draft.height);
    const weight = numberValue(draft.weight);
    const target = numberValue(draft.targetWeight);
    const toNext = (value: number | null, kind: "height" | "weight") => {
      if (value === null) return "";
      if (kind === "height") {
        return formatNumber(next === "metric" ? value * 2.54 : value / 2.54);
      }
      return formatNumber(
        next === "metric" ? value / 2.2046226218 : value * 2.2046226218,
      );
    };
    setDraft((current) => ({
      ...current,
      units: next,
      height: toNext(height, "height"),
      weight: toNext(weight, "weight"),
      targetWeight: toNext(target, "weight"),
    }));
    setError("");
  };

  const validate = () => {
    if (step === 0) {
      if (!/^\d+$/.test(draft.age)) return "Enter your age as a whole number.";
      if (numberValue(draft.age)! < 13 || numberValue(draft.age)! > 100) {
        return "Age must be between 13 and 100.";
      }
      if (metric.heightCm === null) return "Enter your height.";
      if (metric.heightCm < 100 || metric.heightCm > 250) {
        return draft.units === "metric"
          ? "Height must be 100–250 cm."
          : "Height must be 39.4–98.4 in.";
      }
      if (metric.weightKg === null) return "Enter your current weight.";
      if (metric.weightKg < 25 || metric.weightKg > 350) {
        return draft.units === "metric"
          ? "Weight must be 25–350 kg."
          : "Weight must be 55.1–771.6 lb.";
      }
      if (draft.targetWeight.trim() && metric.targetWeightKg === null) {
        return "Enter a valid target weight or leave it blank.";
      }
      if (
        metric.targetWeightKg !== null &&
        (metric.targetWeightKg < 25 || metric.targetWeightKg > 350)
      ) {
        return draft.units === "metric"
          ? "Target weight must be 25–350 kg."
          : "Target weight must be 55.1–771.6 lb.";
      }
    }
    if (step === 2 && draft.equipment.length === 0) {
      return "Choose at least bodyweight or one piece of equipment.";
    }
    return "";
  };

  const next = () => {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };
  const back = () => {
    setError("");
    if (step === 0) {
      router.back();
    } else {
      setStep((current) => current - 1);
    }
  };
  const submit = async () => {
    const validation = validate();
    if (validation) {
      setStep(0);
      setError(validation);
      return;
    }
    const additionalAllergies = draft.customAllergies
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const input: FitnessInput = {
      age: Number(draft.age),
      heightCm: Math.round(metric.heightCm! * 10) / 10,
      weightKg: Math.round(metric.weightKg! * 10) / 10,
      targetWeightKg:
        metric.targetWeightKg === null
          ? null
          : Math.round(metric.targetWeightKg * 10) / 10,
      experience: draft.experience,
      primaryGoal: draft.primaryGoal,
      activityLevel: draft.activityLevel,
      workoutLocation: draft.workoutLocation,
      equipment: draft.equipment,
      dietaryPreference: draft.dietaryPreference,
      allergies: Array.from(
        new Set([...draft.allergies, ...additionalAllergies]),
      ),
      units: draft.units,
      estimateEligible: Number(draft.age) >= 18 && draft.estimateEligible,
    };
    setError("");
    try {
      await save.mutateAsync(input);
      await utils.fitness.get.invalidate();
      await utils.profile.get.invalidate();
      router.replace("/fitness-profile");
    } catch {
      setError(
        "Your fitness profile could not be saved. Check your connection and try again.",
      );
    }
  };

  const reviewSummary = useMemo(
    () => [
      [
        "Basics",
        `${draft.age} years · ${draft.height} ${draft.units === "metric" ? "cm" : "in"} · ${draft.weight} ${draft.units === "metric" ? "kg" : "lb"}`,
      ],
      [
        "Goal",
        goalOptions.find((item) => item.value === draft.primaryGoal)?.label ??
          "General fitness",
      ],
      [
        "Training",
        `${draft.workoutLocation === "gym" ? "Gym" : "Home"} · ${draft.equipment.length} equipment choice${draft.equipment.length === 1 ? "" : "s"}`,
      ],
      [
        "Food",
        `${dietOptions.find((item) => item.value === draft.dietaryPreference)?.label ?? "Omnivore"} · ${draft.allergies.length + (draft.customAllergies.trim() ? 1 : 0)} allergy item${draft.allergies.length + (draft.customAllergies.trim() ? 1 : 0) === 1 ? "" : "s"}`,
      ],
    ],
    [draft],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BackHeader
        title={isEditing ? "Edit fitness profile" : "Fitness profile"}
        badge="5 STEPS"
      />
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>PRIVATE BODYIQ BASELINE</Text>
        <Text accessibilityRole="header" style={styles.heading}>
          {isEditing
            ? "Keep your plan current."
            : "Start with the details that matter."}
        </Text>
        <Body>
          We use these details to tailor training and nutrition guidance. Your
          draft stays in memory until you save.
        </Body>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: 5, now: step + 1 }}
        style={styles.progressWrap}
      >
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((step + 1) / STEPS.length) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          {STEPS.map((label, index) => (
            <Text
              key={label}
              style={[
                styles.progressLabel,
                index <= step && styles.progressLabelActive,
              ]}
            >
              {index + 1}. {label}
            </Text>
          ))}
        </View>
      </View>

      {step === 0 && (
        <BasicsStep
          draft={draft}
          setField={setField}
          switchUnits={switchUnits}
        />
      )}
      {step === 1 && <GoalStep draft={draft} setField={setField} />}
      {step === 2 && (
        <ActivityStep draft={draft} setField={setField} toggle={toggle} />
      )}
      {step === 3 && (
        <FoodStep draft={draft} setField={setField} toggle={toggle} />
      )}
      {step === 4 && (
        <ReviewStep
          draft={draft}
          setField={setField}
          summary={reviewSummary}
          age={numberValue(draft.age)}
        />
      )}

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          title={step === 0 ? "Cancel" : "Back"}
          secondary
          onPress={back}
          icon="arrow-left"
        />
        {step < STEPS.length - 1 ? (
          <Button title="Continue" onPress={next} icon="arrow-right" />
        ) : (
          <Button
            title={
              save.isPending
                ? "Saving securely…"
                : isEditing
                  ? "Save changes"
                  : "Save my profile"
            }
            onPress={() => void submit()}
            disabled={save.isPending}
            icon="check"
          />
        )}
      </View>
      <View style={styles.privacy}>
        <Icon name="lock" color={p.green} size={14} />
        <Body style={{ flex: 1, fontSize: 10, lineHeight: 17 }}>
          No sensitive draft is saved on this device. Leaving this screen clears
          unsaved changes.
        </Body>
      </View>
    </KeyboardAvoidingView>
  );
}

function BasicsStep({
  draft,
  setField,
  switchUnits,
}: {
  draft: Draft;
  setField: <K extends keyof Draft>(field: K, value: Draft[K]) => void;
  switchUnits: (units: Units) => void;
}) {
  return (
    <View>
      <StepHeading
        title="The basics"
        description="A few measurements help us keep recommendations grounded."
      />
      <Section title="Preferred units" />
      <View style={styles.choiceGrid}>
        <Choice
          label="Metric · cm / kg"
          selected={draft.units === "metric"}
          onPress={() => switchUnits("metric")}
        />
        <Choice
          label="Imperial · in / lb"
          selected={draft.units === "imperial"}
          onPress={() => switchUnits("imperial")}
        />
      </View>
      <View style={styles.fieldGrid}>
        <View style={styles.fieldHalf}>
          <AuthField
            label="AGE"
            value={draft.age}
            onChangeText={(value) =>
              setField("age", value.replace(/[^0-9]/g, ""))
            }
            keyboardType="number-pad"
            placeholder="e.g. 28"
            maxLength={3}
          />
        </View>
        <View style={styles.fieldHalf}>
          <AuthField
            label={draft.units === "metric" ? "HEIGHT · CM" : "HEIGHT · IN"}
            value={draft.height}
            onChangeText={(value) =>
              setField("height", value.replace(/[^0-9.,]/g, ""))
            }
            keyboardType="decimal-pad"
            placeholder={draft.units === "metric" ? "e.g. 175" : "e.g. 69"}
          />
        </View>
      </View>
      <AuthField
        label={
          draft.units === "metric"
            ? "CURRENT WEIGHT · KG"
            : "CURRENT WEIGHT · LB"
        }
        value={draft.weight}
        onChangeText={(value) =>
          setField("weight", value.replace(/[^0-9.,]/g, ""))
        }
        keyboardType="decimal-pad"
        placeholder={draft.units === "metric" ? "e.g. 72" : "e.g. 159"}
      />
      <AuthField
        label={
          draft.units === "metric"
            ? "TARGET WEIGHT · KG · OPTIONAL"
            : "TARGET WEIGHT · LB · OPTIONAL"
        }
        value={draft.targetWeight}
        onChangeText={(value) =>
          setField("targetWeight", value.replace(/[^0-9.,]/g, ""))
        }
        keyboardType="decimal-pad"
        placeholder="Leave blank if you prefer"
      />
      <Body style={styles.helper}>
        Target weight is optional. Leave it blank to save it as no target.
      </Body>
    </View>
  );
}

function GoalStep({
  draft,
  setField,
}: {
  draft: Draft;
  setField: <K extends keyof Draft>(field: K, value: Draft[K]) => void;
}) {
  return (
    <View>
      <StepHeading
        title="Your direction"
        description="There is no wrong starting point. Choose what best describes you today."
      />
      <Section title="Experience" />
      <View style={styles.stack}>
        {experienceOptions.map((item) => (
          <Choice
            key={item.value}
            label={`${item.label} · ${item.hint}`}
            selected={draft.experience === item.value}
            onPress={() => setField("experience", item.value)}
          />
        ))}
      </View>
      <Section title="Primary goal" />
      <View style={styles.stack}>
        {goalOptions.map((item) => (
          <Choice
            key={item.value}
            label={item.label}
            selected={draft.primaryGoal === item.value}
            onPress={() => setField("primaryGoal", item.value)}
          />
        ))}
      </View>
      <Section title="Typical activity" />
      <View style={styles.stack}>
        {activityOptions.map((item) => (
          <Choice
            key={item.value}
            label={`${item.label} · ${item.hint}`}
            selected={draft.activityLevel === item.value}
            onPress={() => setField("activityLevel", item.value)}
          />
        ))}
      </View>
    </View>
  );
}

function ActivityStep({
  draft,
  setField,
  toggle,
}: {
  draft: Draft;
  setField: <K extends keyof Draft>(field: K, value: Draft[K]) => void;
  toggle: (field: "equipment" | "allergies", value: string) => void;
}) {
  return (
    <View>
      <StepHeading
        title="Train your way"
        description="Tell us where you train and what you can reach for."
      />
      <Section title="Workout location" />
      <View style={styles.stack}>
        <Choice
          label="Gym · full equipment access"
          selected={draft.workoutLocation === "gym"}
          onPress={() => setField("workoutLocation", "gym")}
        />
        <Choice
          label="Home · my own setup"
          selected={draft.workoutLocation === "home"}
          onPress={() => setField("workoutLocation", "home")}
        />
      </View>
      <Section title="Available equipment" />
      <Body style={styles.helper}>
        Select all that apply. Bodyweight is included by default.
      </Body>
      <View style={styles.stack}>
        {EQUIPMENT.map(([id, label]) => (
          <Choice
            key={id}
            label={label}
            selected={draft.equipment.includes(id)}
            onPress={() => toggle("equipment", id)}
          />
        ))}
      </View>
    </View>
  );
}

function FoodStep({
  draft,
  setField,
  toggle,
}: {
  draft: Draft;
  setField: <K extends keyof Draft>(field: K, value: Draft[K]) => void;
  toggle: (field: "equipment" | "allergies", value: string) => void;
}) {
  return (
    <View>
      <StepHeading
        title="Food preferences"
        description="Your preferences and allergies help us avoid assumptions in meal ideas."
      />
      <Section title="Dietary preference" />
      <View style={styles.stack}>
        {dietOptions.map((item) => (
          <Choice
            key={item.value}
            label={item.label}
            selected={draft.dietaryPreference === item.value}
            onPress={() => setField("dietaryPreference", item.value)}
          />
        ))}
      </View>
      <Section title="Allergies or avoidances" />
      <Body style={styles.helper}>
        Select common items, then add anything else below separated by commas.
      </Body>
      <View style={styles.stack}>
        {ALLERGIES.map(([id, label]) => (
          <Choice
            key={id}
            label={label}
            selected={draft.allergies.includes(id)}
            onPress={() => toggle("allergies", id)}
          />
        ))}
      </View>
      <Text style={styles.inputLabel}>OTHER ITEMS · OPTIONAL</Text>
      <TextInput
        accessibilityLabel="Other allergies or avoidances"
        value={draft.customAllergies}
        onChangeText={(value) => setField("customAllergies", value)}
        placeholder="e.g. oats, coconut"
        placeholderTextColor={p.muted}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.textInput}
      />
    </View>
  );
}

function ReviewStep({
  draft,
  setField,
  summary,
  age,
}: {
  draft: Draft;
  setField: <K extends keyof Draft>(field: K, value: Draft[K]) => void;
  summary: string[][];
  age: number | null;
}) {
  const canEstimate = age !== null && age >= 18;
  return (
    <View>
      <StepHeading
        title="Review and save"
        description="Check your details, then choose whether you want estimated targets."
      />
      <Card style={styles.reviewCard}>
        {summary.map(([label, value]) => (
          <View key={label} style={styles.reviewRow}>
            <Label>{label.toUpperCase()}</Label>
            <Text style={styles.reviewValue}>{value}</Text>
          </View>
        ))}
        {draft.targetWeight ? (
          <View style={styles.reviewRow}>
            <Label>TARGET</Label>
            <Text style={styles.reviewValue}>
              {draft.targetWeight} {draft.units === "metric" ? "kg" : "lb"}
            </Text>
          </View>
        ) : null}
      </Card>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: draft.estimateEligible,
          disabled: !canEstimate,
        }}
        disabled={!canEstimate}
        onPress={() => setField("estimateEligible", !draft.estimateEligible)}
        style={[styles.eligibility, !canEstimate && styles.eligibilityDisabled]}
      >
        <View
          style={[
            styles.checkbox,
            draft.estimateEligible && canEstimate && styles.checkboxChecked,
          ]}
        >
          {draft.estimateEligible && canEstimate ? (
            <Icon name="check" color={p.background} size={15} />
          ) : null}
        </View>
        <Text style={styles.eligibilityText}>
          I am 18 or older, not pregnant or breastfeeding, and do not need a
          clinical diet.
        </Text>
      </Pressable>
      {!canEstimate ? (
        <Body style={styles.note}>
          Because you are under 18, estimated calorie and macro targets will
          stay off. You can still save your profile and receive general
          guidance.
        </Body>
      ) : (
        <Body style={styles.note}>
          Only check this if it accurately describes you. BodyIQ is not medical
          care; speak with a qualified clinician for clinical nutrition needs.
        </Body>
      )}
      <View style={styles.secureRow}>
        <Icon name="shield" color={p.green} size={15} />
        <Body style={{ flex: 1, fontSize: 11 }}>
          Your profile is saved to your authenticated BodyIQ account, not as a
          guest record.
        </Body>
      </View>
    </View>
  );
}

function StepHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.stepHeading}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Body>{description}</Body>
    </View>
  );
}

export function OnboardingLoading() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={p.green} />
      <Body style={{ marginTop: 14 }}>Loading your saved fitness profile…</Body>
    </View>
  );
}

export function OnboardingError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card style={{ marginTop: 10 }}>
      <Text style={styles.stepTitle}>We couldn’t load your profile.</Text>
      <Body style={{ marginTop: 8, marginBottom: 18 }}>
        Your saved data has not been changed. Check your connection and try
        again.
      </Body>
      <Button
        title="Retry loading profile"
        onPress={onRetry}
        icon="refresh-cw"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 22 },
  eyebrow: {
    color: p.green,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  heading: {
    color: p.text,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  progressWrap: { marginBottom: 24 },
  progressTrack: {
    height: 5,
    borderRadius: 5,
    backgroundColor: p.border,
    overflow: "hidden",
  },
  progressFill: { height: 5, borderRadius: 5, backgroundColor: p.green },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },
  progressLabel: { color: p.muted, fontSize: 9, fontWeight: "600" },
  progressLabelActive: { color: p.green },
  stepHeading: { marginBottom: 5 },
  stepTitle: {
    color: p.text,
    fontSize: 23,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 7,
  },
  choiceGrid: { gap: 10 },
  stack: { gap: 10 },
  fieldGrid: { flexDirection: "row", gap: 12 },
  fieldHalf: { flex: 1 },
  helper: { fontSize: 11, lineHeight: 17, marginTop: -5, marginBottom: 18 },
  inputLabel: {
    color: p.muted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.1,
    marginTop: 8,
    marginBottom: 9,
  },
  textInput: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.background,
    color: p.text,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 8,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 28 },
  actionsButton: { flex: 1 },
  error: { color: p.error, fontSize: 12, lineHeight: 19, marginTop: 18 },
  privacy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 22,
    marginBottom: 12,
  },
  reviewCard: { marginTop: 15, gap: 15 },
  reviewRow: { gap: 5 },
  reviewValue: { color: p.text, fontSize: 14, lineHeight: 20 },
  eligibility: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 15,
    marginTop: 18,
    borderWidth: 1,
    borderColor: p.green,
    borderRadius: 14,
    backgroundColor: p.greenDark,
  },
  eligibilityDisabled: {
    borderColor: p.border,
    backgroundColor: p.surface,
    opacity: 0.8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: p.muted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { borderColor: p.green, backgroundColor: p.green },
  eligibilityText: { flex: 1, color: p.text, fontSize: 12, lineHeight: 18 },
  note: { fontSize: 11, lineHeight: 17, marginTop: 12 },
  secureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 20,
  },
  centerState: { alignItems: "center", paddingVertical: 52 },
});
