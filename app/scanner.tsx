import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import {
  AuthGate,
  FieldError,
  SubmissionError,
  TrackingField,
  parseMeasurement,
} from "@/components/bodyiq/tracking-form";
import {
  Badge,
  Body,
  Button,
  Card,
  Choice,
  Icon,
  Label,
  Section,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
import { getDeviceTimeZone, useRefreshTracking } from "@/lib/tracking-client";
import { trpc } from "@/lib/trpc";

// The scanner router is supplied by the app service. Keep this adapter local so
// the screen can consume the service contract without changing shared/backend code.
type ScannerEstimate = {
  status: "clear" | "unclear";
  likelyItems: { name: string; ingredients: string[]; confidence: number }[];
  servingEstimate: string | null;
  nutrition: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  } | null;
  confidence?: number;
  note: string;
};

type ScannerMutation = {
  isPending: boolean;
  mutateAsync: (input: {
    imageBase64: string;
    mimeType: string;
  }) => Promise<ScannerEstimate>;
};

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const mealTypes: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export default function ScannerScreen() {
  const auth = useAuth();
  return <ScannerForm key={auth.user?.id ?? "signed-out"} />;
}

function ScannerForm() {
  const analyze = trpc.foodScanner.analyze.useMutation() as ScannerMutation;
  const saveMeal = trpc.tracking.logMeal.useMutation();
  const refreshTracking = useRefreshTracking();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<ScannerEstimate | null>(null);
  const [status, setStatus] = useState<
    "idle" | "analyzing" | "unclear" | "review" | "saved"
  >("idle");
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [name, setName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [mealClientId, setMealClientId] = useState<string | null>(null);

  function resetDraft() {
    setImageUri(null);
    setEstimate(null);
    setStatus("idle");
    setError("");
    setValidationError("");
    setSubmitError("");
    setName("");
    setServingSize("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setMealType("breakfast");
    setMealClientId(null);
  }

  async function chooseImage(source: "camera" | "gallery") {
    setError("");
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(
          source === "camera"
            ? "Camera access is needed to take a food photo."
            : "Photo library access is needed to choose a food photo.",
        );
        return;
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              base64: true,
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              base64: true,
              quality: 0.8,
            });
      if (result.canceled || !result.assets[0]?.base64) return;
      const asset = result.assets[0];
      const base64 = asset.base64;
      if (!base64) return;
      const mimeType = asset.mimeType;
      if (
        mimeType !== "image/jpeg" &&
        mimeType !== "image/png" &&
        mimeType !== "image/webp"
      ) {
        setError(
          "This image format is not supported yet. Choose a JPEG, PNG, or WebP photo.",
        );
        return;
      }
      setImageUri(asset.uri);
      setStatus("analyzing");
      try {
        const analyzed = await analyze.mutateAsync({
          imageBase64: base64,
          mimeType,
        });
        setEstimate(analyzed);
        const foods = analyzed.likelyItems.map((item) => item.name);
        const nutrition = analyzed.nutrition;
        setName(foods.join(", "));
        setServingSize(analyzed.servingEstimate ?? "");
        setCalories(String(nutrition?.calories ?? ""));
        setProtein(String(nutrition?.proteinG ?? ""));
        setCarbs(String(nutrition?.carbsG ?? ""));
        setFat(String(nutrition?.fatG ?? ""));
        setStatus(analyzed.status === "unclear" ? "unclear" : "review");
      } catch {
        setStatus("idle");
        setError(
          "The food scan service is unavailable. Try again or log this meal manually.",
        );
      }
    } catch {
      setStatus("idle");
      setError(
        source === "camera"
          ? "Camera could not open. Check permission and try again, or choose a photo from your gallery."
          : "The photo library could not open. Check permission and try again.",
      );
    }
  }

  async function confirmMeal() {
    setValidationError("");
    setSubmitError("");
    const kcal = parseMeasurement(calories);
    const proteinG = parseMeasurement(protein);
    const carbsG = parseMeasurement(carbs);
    const fatG = parseMeasurement(fat);
    if (!name.trim() || !servingSize.trim()) {
      setValidationError("Add a food name and serving size before confirming.");
      return;
    }
    const savedName = `${name.trim()} · ${servingSize.trim()}`;
    if (savedName.length > 100) {
      setValidationError(
        "Shorten the food name or serving size so the saved meal fits within 100 characters.",
      );
      return;
    }
    if (
      kcal === null ||
      proteinG === null ||
      carbsG === null ||
      fatG === null ||
      ![kcal, proteinG, carbsG, fatG].every(
        (value) => Number.isFinite(value) && value >= 0,
      )
    ) {
      setValidationError("Nutrition values must be zero or greater numbers.");
      return;
    }
    const clientId = mealClientId ?? Crypto.randomUUID();
    setMealClientId(clientId);
    try {
      await saveMeal.mutateAsync({
        clientId,
        name: savedName,
        mealType,
        calories: kcal,
        proteinG,
        carbsG,
        fatG,
        timeZone: getDeviceTimeZone(),
      });
      await refreshTracking();
      setStatus("saved");
    } catch {
      setSubmitError(
        "We couldn’t confirm this scan. Your meal was not reported as saved.",
      );
    }
  }

  const locked =
    analyze.isPending ||
    saveMeal.isPending ||
    status === "analyzing" ||
    status === "saved";
  return (
    <AuthGate title="Food scanner" badge="TRACKING">
      <View style={styles.topRow}>
        <Body style={{ flex: 1 }}>
          Scan a plate, then check every estimate before it enters your record.
        </Body>
        <Badge text="AUTHENTICATED" />
      </View>
      <View style={styles.manualLink}>
        <Button
          title="Log a meal manually"
          secondary
          onPress={() => router.push("/log-meal")}
          icon="edit-3"
        />
      </View>

      {status === "saved" ? (
        <Card>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.title}>Meal logged securely.</Text>
          <Body style={{ marginTop: 8, marginBottom: 20 }}>
            Your confirmed values are now in today’s private tracking record.
          </Body>
          <Button
            title="Scan another meal"
            onPress={resetDraft}
            icon="camera"
          />
        </Card>
      ) : status === "review" && imageUri ? (
        <ReviewState />
      ) : status === "unclear" ? (
        <UnclearState />
      ) : (
        <CaptureState />
      )}

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorTitle}>{error}</Text>
          <Button
            title="Try again"
            onPress={() => setError("")}
            secondary
            icon="refresh-cw"
          />
        </Card>
      ) : null}
      {submitError ? (
        <SubmissionError
          message={submitError}
          onRetry={() => void confirmMeal()}
          onNew={resetDraft}
        />
      ) : null}

      <View style={styles.tip}>
        <Icon name="sun" color={p.green} size={18} />
        <View style={{ flex: 1 }}>
          <Text style={styles.tipTitle}>Estimates are a starting point.</Text>
          <Body style={{ fontSize: 11 }}>
            Lighting, ingredients, and portion size can change the result. Edit
            the draft to match what you actually ate.
          </Body>
        </View>
      </View>

      {status === "review" && imageUri ? <ReviewFields /> : null}
    </AuthGate>
  );

  function CaptureState() {
    return (
      <Card>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.captureIcon}>
            <Icon name="camera" color={p.green} size={32} />
          </View>
        )}
        <Text style={styles.title}>
          {status === "analyzing"
            ? "Reading your plate…"
            : "Capture a food photo"}
        </Text>
        <Body style={{ textAlign: "center", marginTop: 8, marginBottom: 20 }}>
          {status === "analyzing"
            ? "Analyzing likely foods and ingredients. This can take a moment."
            : "Use a clear, well-lit photo. You will review and edit the estimate before saving."}
        </Body>
        {status === "analyzing" ? (
          <ActivityIndicator color={p.green} size="large" />
        ) : (
          <>
            <Button
              title="Take a photo"
              onPress={() => void chooseImage("camera")}
              icon="camera"
            />
            <View style={{ height: 10 }} />
            <Button
              title="Choose from gallery"
              secondary
              onPress={() => void chooseImage("gallery")}
              icon="image"
            />
          </>
        )}
      </Card>
    );
  }

  function ReviewState() {
    const foods = estimate?.likelyItems.map((item) => item.name) ?? [];
    const ingredients = Array.from(
      new Set(estimate?.likelyItems.flatMap((item) => item.ingredients) ?? []),
    );
    return (
      <Card>
        <Image source={{ uri: imageUri! }} style={styles.image} />
        <View style={styles.resultHeader}>
          <Label>ESTIMATED SCAN</Label>
          <Badge
            text={`${Math.round((estimate?.confidence ?? 0) * 100)}% CONFIDENCE`}
            color={p.orange}
          />
        </View>
        <Text style={styles.estimateTitle}>
          {foods.length ? foods.join(", ") : name}
        </Text>
        <Body style={{ marginTop: 7 }}>
          Likely foods / ingredients · estimate only
        </Body>
        {ingredients.length ? (
          <Body style={styles.ingredients}>
            Likely ingredients: {ingredients.slice(0, 12).join(", ")}
          </Body>
        ) : null}
        <Body color={p.orange} style={styles.unclear}>
          Estimates are not exact. Please edit the values below before saving.
        </Body>
        <Pressable
          onPress={resetDraft}
          style={styles.retryLink}
          accessibilityRole="button"
        >
          <Icon name="refresh-cw" color={p.green} size={15} />
          <Text style={styles.retryText}>Retake or choose another photo</Text>
        </Pressable>
      </Card>
    );
  }

  function UnclearState() {
    return (
      <Card>
        <View style={styles.captureIcon}>
          <Icon name="help-circle" color={p.orange} size={32} />
        </View>
        <Text style={styles.title}>The photo was unclear.</Text>
        <Body style={{ textAlign: "center", marginTop: 8, marginBottom: 20 }}>
          No reliable food or nutrition estimate was returned, so nothing can be
          saved from this scan.
        </Body>
        <Body
          color={p.orange}
          style={{ textAlign: "center", marginBottom: 18 }}
        >
          {estimate?.note ||
            "Try a brighter, closer photo with the whole plate in frame."}
        </Body>
        <Button title="Retake photo" onPress={resetDraft} icon="camera" />
        <View style={{ height: 10 }} />
        <Button
          title="Log this meal manually"
          secondary
          onPress={() => router.push("/log-meal")}
          icon="edit-3"
        />
      </Card>
    );
  }

  function ReviewFields() {
    return (
      <>
        <Section title="Review and edit" />
        <Card>
          <Body style={styles.estimateNotice}>
            AI nutrition estimates are not exact. Confirm or correct them before
            saving.
          </Body>
          <TrackingField
            label="FOOD NAME"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Chicken rice bowl"
            editable={!locked}
            maxLength={100}
            autoCapitalize="words"
            keyboardType="default"
          />
          <TrackingField
            label="SERVING SIZE"
            value={servingSize}
            onChangeText={setServingSize}
            placeholder="e.g. 1 bowl"
            editable={!locked}
            maxLength={80}
            keyboardType="default"
          />
          <Label>MEAL TYPE</Label>
          <View style={styles.choiceStack}>
            {mealTypes.map((item) => (
              <Choice
                key={item.value}
                label={item.label}
                selected={mealType === item.value}
                onPress={() => !locked && setMealType(item.value)}
              />
            ))}
          </View>
        </Card>
        <Section title="Estimated nutrition" />
        <Card>
          <TrackingField
            label="ESTIMATED CALORIES · KCAL"
            value={calories}
            onChangeText={setCalories}
            placeholder="Calories"
            editable={!locked}
            accessibilityLabel="Estimated calories"
          />
          <TrackingField
            label="ESTIMATED PROTEIN · G"
            value={protein}
            onChangeText={setProtein}
            placeholder="Protein"
            editable={!locked}
            accessibilityLabel="Estimated protein"
          />
          <TrackingField
            label="ESTIMATED CARBS · G"
            value={carbs}
            onChangeText={setCarbs}
            placeholder="Carbs"
            editable={!locked}
            accessibilityLabel="Estimated carbohydrates"
          />
          <TrackingField
            label="ESTIMATED FAT · G"
            value={fat}
            onChangeText={setFat}
            placeholder="Fat"
            editable={!locked}
            accessibilityLabel="Estimated fat"
          />
        </Card>
        {validationError ? <FieldError>{validationError}</FieldError> : null}
        <View style={{ marginTop: 18 }}>
          <Button
            title={
              saveMeal.isPending ? "Saving securely…" : "Confirm and save meal"
            }
            onPress={() => void confirmMeal()}
            disabled={locked}
            icon="check"
          />
        </View>
        <Body style={styles.privacyNote}>
          Only your edited values are saved. If saving fails, this draft and its
          request ID stay available for the same retry.
        </Body>
      </>
    );
  }
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  manualLink: { marginBottom: 20 },
  captureIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: p.greenDark,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: p.background,
    marginBottom: 18,
  },
  title: {
    color: p.text,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  estimateTitle: {
    color: p.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "600",
    marginTop: 16,
  },
  ingredients: { marginTop: 8, lineHeight: 18 },
  unclear: { marginTop: 12, lineHeight: 18 },
  retryLink: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 20,
    minHeight: 44,
  },
  retryText: { color: p.green, fontSize: 12, fontWeight: "600" },
  estimateNotice: {
    color: p.orange,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 18,
  },
  choiceStack: { gap: 9, marginTop: 10 },
  privacyNote: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 18,
    paddingHorizontal: 2,
  },
  tip: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    padding: 17,
    backgroundColor: "#192113",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#C3FF5C20",
    marginTop: 24,
  },
  tipTitle: { color: p.text, fontSize: 12, fontWeight: "500", marginBottom: 6 },
  errorCard: { borderColor: `${p.error}66`, marginTop: 16, gap: 14 },
  errorTitle: { color: p.error, fontSize: 13, lineHeight: 19 },
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
});
