import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import {
  AuthGate,
  FieldError,
  SubmissionError,
  TrackingField,
  parseMeasurement,
  styles as trackingStyles,
} from "@/components/bodyiq/tracking-form";
import {
  Body,
  Button,
  Card,
  Choice,
  Label,
  Section,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
import { getDeviceTimeZone, useRefreshTracking } from "@/lib/tracking-client";
import { trpc } from "@/lib/trpc";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const mealTypes: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export default function LogMealScreen() {
  const auth = useAuth();
  return <LogMealForm key={auth.user?.id ?? "signed-out"} />;
}

type MealDraft = {
  name: string;
  mealType: MealType;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function parseCatalogDraft(rawCatalog: string | undefined): MealDraft | null {
  if (!rawCatalog) return null;
  try {
    const value = JSON.parse(rawCatalog) as Record<string, unknown>;
    if (
      typeof value.name !== "string" ||
      typeof value.calories !== "number" ||
      typeof value.protein !== "number" ||
      typeof value.carbs !== "number" ||
      typeof value.fat !== "number"
    )
      return null;
    return {
      name: value.name.slice(0, 100),
      mealType: "breakfast",
      calories: value.calories,
      proteinG: value.protein,
      carbsG: value.carbs,
      fatG: value.fat,
    };
  } catch {
    return null;
  }
}

function mealToDraft(meal: {
  name: string;
  mealType: MealType;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}): MealDraft {
  return {
    name: meal.name,
    mealType: meal.mealType,
    calories: meal.calories,
    proteinG: meal.proteinG,
    carbsG: meal.carbsG,
    fatG: meal.fatG,
  };
}

function LogMealForm() {
  const params = useLocalSearchParams<{ editId?: string; catalog?: string }>();
  const editId = Number(params.editId);
  const editing = Number.isInteger(editId) && editId > 0;
  const summary = trpc.tracking.get.useQuery(
    { timeZone: getDeviceTimeZone() },
    { enabled: editing, retry: false },
  );
  const rawCatalog =
    typeof params.catalog === "string" ? params.catalog : undefined;
  const catalogDraft = parseCatalogDraft(rawCatalog);
  const loadedMeal = editing
    ? summary.data?.meals.find((item) => item.id === editId)
    : undefined;
  const initialDraft = loadedMeal ? mealToDraft(loadedMeal) : catalogDraft;
  return (
    <LogMealEditor
      key={loadedMeal ? `meal-${loadedMeal.id}` : (rawCatalog ?? "new")}
      initialDraft={initialDraft}
      editId={editId}
      editing={editing}
    />
  );
}

function LogMealEditor({
  initialDraft,
  editId,
  editing,
}: {
  initialDraft: MealDraft | null;
  editId: number;
  editing: boolean;
}) {
  const saveMeal = trpc.tracking.logMeal.useMutation();
  const updateMeal = trpc.tracking.updateMeal.useMutation();
  const refreshTracking = useRefreshTracking();
  const [name, setName] = useState(() => initialDraft?.name ?? "");
  const [mealType, setMealType] = useState<MealType>(
    () => initialDraft?.mealType ?? "breakfast",
  );
  const [calories, setCalories] = useState(() =>
    initialDraft ? String(initialDraft.calories) : "",
  );
  const [protein, setProtein] = useState(() =>
    initialDraft ? String(initialDraft.proteinG) : "",
  );
  const [carbs, setCarbs] = useState(() =>
    initialDraft ? String(initialDraft.carbsG) : "",
  );
  const [fat, setFat] = useState(() =>
    initialDraft ? String(initialDraft.fatG) : "",
  );
  const [mealClientId, setMealClientId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saved, setSaved] = useState(false);
  const locked =
    saveMeal.isPending || updateMeal.isPending || Boolean(submitError);

  function clearDraft() {
    setName("");
    setMealType("breakfast");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setMealClientId(null);
    setValidationError("");
    setSubmitError("");
    setSaved(false);
  }

  async function submit() {
    setValidationError("");
    setSubmitError("");
    const kcal = parseMeasurement(calories);
    const proteinG = parseMeasurement(protein);
    const carbsG = parseMeasurement(carbs);
    const fatG = parseMeasurement(fat);
    if (!name.trim() || name.trim().length > 100) {
      setValidationError("Enter a meal name between 1 and 100 characters.");
      return;
    }
    if (kcal === null || kcal < 0 || kcal > 10000) {
      setValidationError("Calories must be a number from 0 to 10,000 kcal.");
      return;
    }
    if (proteinG === null || proteinG < 0 || proteinG > 1000) {
      setValidationError("Protein must be a number from 0 to 1,000 g.");
      return;
    }
    if (carbsG === null || carbsG < 0 || carbsG > 1000) {
      setValidationError("Carbs must be a number from 0 to 1,000 g.");
      return;
    }
    if (fatG === null || fatG < 0 || fatG > 1000) {
      setValidationError("Fat must be a number from 0 to 1,000 g.");
      return;
    }

    if (editing) {
      try {
        await updateMeal.mutateAsync({
          id: editId,
          name: name.trim(),
          mealType,
          calories: kcal,
          proteinG,
          carbsG,
          fatG,
        });
        await refreshTracking();
        setSaved(true);
      } catch {
        setSubmitError(
          "We couldn’t confirm this update. Your entry was not reported as changed.",
        );
      }
      return;
    }
    const clientId = mealClientId ?? Crypto.randomUUID();
    setMealClientId(clientId);
    try {
      await saveMeal.mutateAsync({
        clientId,
        name: name.trim(),
        mealType,
        calories: kcal,
        proteinG,
        carbsG,
        fatG,
        timeZone: getDeviceTimeZone(),
      });
      await refreshTracking();
      // Clear only after the server confirms success. Failed or ambiguous
      // requests keep the exact draft and clientId available for retry.
      clearDraft();
      setSaved(true);
    } catch {
      setSubmitError(
        "We couldn’t confirm this meal. Your entry was not reported as saved.",
      );
    }
  }

  return (
    <AuthGate title="Log a meal" badge="TRACKING">
      {saved ? (
        <Card>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.title}>Meal logged securely.</Text>
          <Body style={{ marginTop: 8, marginBottom: 20 }}>
            Your entered amounts are now part of today’s private tracking
            record.
          </Body>
          <Button
            title="Back to home"
            onPress={() => router.replace("/(tabs)")}
            icon="home"
          />
          <View style={{ height: 10 }} />
          <Button
            title="Log another meal"
            onPress={() => setSaved(false)}
            secondary
            icon="plus"
          />
        </Card>
      ) : (
        <>
          <Text style={styles.heading}>
            {editing ? "Edit your meal." : "Add what you ate."}
          </Text>
          <Body style={{ marginBottom: 22 }}>
            Keep your record honest and simple. Enter the nutrition information
            from your label or source; BodyIQ does not invent values here.
          </Body>

          <Card>
            <TrackingField
              editable={!locked}
              label="MEAL NAME"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Chicken rice bowl"
              keyboardType="default"
              autoCapitalize="words"
              maxLength={100}
            />
            <Label>MEAL TYPE</Label>
            <View style={styles.choiceStack}>
              {mealTypes.map((item) => (
                <Choice
                  key={item.value}
                  label={item.label}
                  selected={mealType === item.value}
                  onPress={() => {
                    if (!locked) setMealType(item.value);
                  }}
                />
              ))}
            </View>
          </Card>

          <Section title="Nutrition amounts" />
          <Card>
            <TrackingField
              editable={!locked}
              label="CALORIES · KCAL"
              value={calories}
              onChangeText={setCalories}
              placeholder="Enter calories"
              accessibilityLabel="Calories"
            />
            <TrackingField
              editable={!locked}
              label="PROTEIN · G"
              value={protein}
              onChangeText={setProtein}
              placeholder="Enter protein"
              accessibilityLabel="Protein in grams"
            />
            <TrackingField
              editable={!locked}
              label="CARBS · G"
              value={carbs}
              onChangeText={setCarbs}
              placeholder="Enter carbs"
              accessibilityLabel="Carbohydrates in grams"
            />
            <TrackingField
              editable={!locked}
              label="FAT · G"
              value={fat}
              onChangeText={setFat}
              placeholder="Enter fat"
              accessibilityLabel="Fat in grams"
            />
          </Card>

          <Section title="Review before saving" />
          <Card style={styles.reviewCard}>
            <Label>USER-ENTERED AMOUNTS</Label>
            <View style={styles.reviewRow}>
              <ReviewMetric
                label="Calories"
                value={parseMeasurement(calories)}
                unit="kcal"
              />
              <ReviewMetric
                label="Protein"
                value={parseMeasurement(protein)}
                unit="g"
              />
              <ReviewMetric
                label="Carbs"
                value={parseMeasurement(carbs)}
                unit="g"
              />
              <ReviewMetric
                label="Fat"
                value={parseMeasurement(fat)}
                unit="g"
              />
            </View>
            <Body style={styles.reviewNote}>
              These are the amounts you entered—not AI estimates. Check them
              against your source before saving.
            </Body>
          </Card>

          {validationError ? <FieldError>{validationError}</FieldError> : null}
          <View style={{ marginTop: 18 }}>
            <Button
              title={
                saveMeal.isPending || updateMeal.isPending
                  ? "Saving securely…"
                  : editing
                    ? "Save changes"
                    : "Save meal"
              }
              onPress={() => void submit()}
              disabled={saveMeal.isPending || updateMeal.isPending}
              icon="check"
            />
          </View>
          {submitError ? (
            <SubmissionError
              message={submitError}
              onRetry={() => void submit()}
              onNew={clearDraft}
            />
          ) : null}
          <Body style={styles.privacyNote}>
            Your entry is sent to your authenticated BodyIQ account with a
            device time zone. Blank drafts are not stored on this device.
          </Body>
        </>
      )}
    </AuthGate>
  );
}

function ReviewMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <View style={{ flex: 1, minWidth: 66 }}>
      <Label>{label.toUpperCase()}</Label>
      <Text style={trackingStyles.reviewValue}>
        {value ?? "—"} <Text style={trackingStyles.reviewUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: p.text,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
    marginBottom: 9,
  },
  choiceStack: { gap: 9, marginTop: 10 },
  reviewCard: { borderColor: p.greenDark },
  reviewRow: { flexDirection: "row", flexWrap: "wrap", gap: 15, marginTop: 17 },
  reviewNote: { fontSize: 11, lineHeight: 17, marginTop: 17 },
  privacyNote: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 18,
    paddingHorizontal: 2,
  },
  successIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: p.greenDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  successCheck: { color: p.green, fontSize: 31, fontWeight: "700" },
  title: {
    color: p.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
});
