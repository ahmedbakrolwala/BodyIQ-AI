import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as Crypto from "expo-crypto";
import {
  AuthGate,
  FieldError,
  SubmissionError,
  TrackingField,
  TrackingLoading,
  TrackingQueryError,
  formatMeasurement,
  parseMeasurement,
} from "@/components/bodyiq/tracking-form";
import {
  Body,
  Button,
  Card,
  Label,
  Segmented,
  Section,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
import { kilogramsToPounds, poundsToKilograms } from "@/shared/fitness";
import {
  getDeviceTimeZone,
  useRefreshTracking,
  useTrackingSummary,
} from "@/lib/tracking-client";
import { trpc } from "@/lib/trpc";

type Units = "metric" | "imperial";

function formatWeight(value: number) {
  return formatMeasurement(value, 1);
}

export default function LogWeightScreen() {
  const auth = useAuth();
  return <LogWeightForm key={auth.user?.id ?? "signed-out"} />;
}

function LogWeightForm() {
  const summary = useTrackingSummary();
  const saveWeight = trpc.tracking.logWeight.useMutation();
  const refreshTracking = useRefreshTracking();
  const [selectedUnits, setSelectedUnits] = useState<Units | null>(null);
  const [weight, setWeight] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saved, setSaved] = useState(false);

  const data = summary.data;
  const units = selectedUnits ?? data?.units ?? "metric";

  const locked = saveWeight.isPending || Boolean(submitError);

  function changeUnits(next: string) {
    if (locked) return;
    const nextUnits = next as Units;
    if (nextUnits === units) return;
    if (
      weight.trim() &&
      Number.isFinite(Number(weight.trim().replace(",", ".")))
    ) {
      const current = parseMeasurement(weight);
      if (current === null) return;
      const kg = units === "imperial" ? poundsToKilograms(current) : current;
      setWeight(
        formatWeight(nextUnits === "imperial" ? kilogramsToPounds(kg) : kg),
      );
    }
    setSelectedUnits(nextUnits);
  }

  function clearDraft() {
    setWeight("");
    setClientId(null);
    setValidationError("");
    setSubmitError("");
    setSaved(false);
  }

  async function submit() {
    setValidationError("");
    setSubmitError("");
    if (
      !weight.trim() ||
      !Number.isFinite(Number(weight.trim().replace(",", ".")))
    ) {
      setValidationError("Enter your current weight before saving.");
      return;
    }
    const entered = parseMeasurement(weight);
    if (entered === null) {
      setValidationError("Enter a valid weight.");
      return;
    }
    const weightKg =
      units === "imperial" ? poundsToKilograms(entered) : entered;
    if (weightKg < 25 || weightKg > 350) {
      setValidationError("Weight must convert to a value from 25 to 350 kg.");
      return;
    }
    const requestId = clientId ?? Crypto.randomUUID();
    setClientId(requestId);
    try {
      await saveWeight.mutateAsync({
        clientId: requestId,
        weightKg,
        timeZone: getDeviceTimeZone(),
      });
      await refreshTracking();
      clearDraft();
      setSaved(true);
    } catch {
      setSubmitError(
        "We couldn’t confirm this weight. Your entry was not reported as saved.",
      );
    }
  }

  return (
    <AuthGate title="Log weight" badge="PROGRESS">
      {summary.isLoading ? (
        <TrackingLoading label="Loading your saved progress…" />
      ) : summary.isError ? (
        <TrackingQueryError onRetry={() => void summary.refetch()} />
      ) : saved ? (
        <Card>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.title}>Weight logged securely.</Text>
          <Body style={{ marginTop: 8, marginBottom: 20 }}>
            Your measurement was synced to your private progress record.
          </Body>
          <Button
            title="Back to home"
            onPress={() => router.replace("/(tabs)")}
            icon="home"
          />
          <View style={{ height: 10 }} />
          <Button
            title="Log another measurement"
            onPress={() => setSaved(false)}
            secondary
            icon="plus"
          />
        </Card>
      ) : !data ? (
        <Card>
          <Text style={styles.title}>Your tracking profile is not ready.</Text>
          <Body style={{ marginTop: 8, marginBottom: 19 }}>
            Complete fitness onboarding before recording progress so your unit
            preference is known.
          </Body>
          <Button
            title="Open fitness onboarding"
            onPress={() => router.push("/onboarding")}
            icon="arrow-right"
          />
        </Card>
      ) : (
        <>
          <Text style={styles.heading}>A measurement, not a judgment.</Text>
          <Body style={{ marginBottom: 22 }}>
            Record the number you see today. It will be stored canonically in
            kilograms while your chosen display unit stays yours.
          </Body>

          <Card style={styles.currentCard}>
            <Label>CURRENT WEIGHT ON FILE</Label>
            <Text style={styles.currentWeight}>
              {data.currentWeightKg === null
                ? "No measurement yet"
                : `${formatWeight(data.units === "imperial" ? kilogramsToPounds(data.currentWeightKg) : data.currentWeightKg)} ${data.units === "imperial" ? "lb" : "kg"}`}
            </Text>
            <Body style={{ fontSize: 11, marginTop: 6 }}>
              This is a read-only summary. The new field below starts blank.
            </Body>
          </Card>

          <Section title="New measurement" />
          <Card>
            <Segmented
              options={["metric", "imperial"]}
              value={units}
              onChange={changeUnits}
            />
            <TrackingField
              editable={!locked}
              label={units === "metric" ? "WEIGHT · KG" : "WEIGHT · LB"}
              value={weight}
              onChangeText={setWeight}
              placeholder={
                units === "metric" ? "Enter kilograms" : "Enter pounds"
              }
              accessibilityLabel={
                units === "metric" ? "Weight in kilograms" : "Weight in pounds"
              }
            />
            <Body style={styles.rangeNote}>
              Accepted range: 25–350 kg, converted from your selected display
              unit.
            </Body>
          </Card>

          {validationError ? <FieldError>{validationError}</FieldError> : null}
          <View style={{ marginTop: 18 }}>
            <Button
              title={
                saveWeight.isPending ? "Saving securely…" : "Save measurement"
              }
              onPress={() => void submit()}
              disabled={saveWeight.isPending}
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
            Blank drafts stay in this authenticated screen only; no plaintext
            measurement draft is written to device storage.
          </Body>
        </>
      )}
    </AuthGate>
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
  title: { color: p.text, fontSize: 22, fontWeight: "700", marginTop: 14 },
  currentCard: { borderColor: p.greenDark },
  currentWeight: {
    color: p.green,
    fontSize: 29,
    fontWeight: "700",
    marginTop: 13,
  },
  rangeNote: { color: p.muted, fontSize: 11, lineHeight: 17, marginTop: -3 },
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
});
