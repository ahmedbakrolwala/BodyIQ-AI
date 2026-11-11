import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/server/routers";
import type { inferRouterOutputs } from "@trpc/server";
import { router, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import {
  AuthGate,
  SubmissionError,
  TrackingLoading,
  TrackingQueryError,
} from "@/components/bodyiq/tracking-form";
import {
  Body,
  Button,
  Card,
  Icon,
  Label,
  Section,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";

type WorkoutPlan = inferRouterOutputs<AppRouter>["workouts"]["getPlan"];
type PlanExercise = WorkoutPlan["exercises"][number];
type WorkoutSession = inferRouterOutputs<AppRouter>["workouts"]["startSession"];
type LoggedSet = inferRouterOutputs<AppRouter>["workouts"]["logSet"];

function formatDate(value: string | Date | null) {
  if (!value) return "an unknown time";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export default function WorkoutSessionScreen() {
  const auth = useAuth();
  return <WorkoutSessionForm key={auth.user?.id ?? "signed-out"} />;
}

function WorkoutSessionForm() {
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = Number(params.planId);
  const validPlanId = Number.isInteger(planId) && planId > 0;
  const plan = trpc.workouts.getPlan.useQuery(
    { planId },
    { enabled: validPlanId, retry: false },
  );
  const startSession = trpc.workouts.startSession.useMutation();
  const completeSession = trpc.workouts.completeSession.useMutation();
  const [clientId, setClientId] = useState<string | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [startError, setStartError] = useState("");
  const [completeError, setCompleteError] = useState("");
  const [completed, setCompleted] = useState(false);

  async function start() {
    setStartError("");
    const requestClientId = clientId ?? Crypto.randomUUID();
    setClientId(requestClientId);
    try {
      const response = await startSession.mutateAsync({
        planId,
        clientId: requestClientId,
      });
      setSession(response);
    } catch {
      setStartError(
        "We couldn’t confirm the session start. It has not been reported as started; retry to safely check the same request.",
      );
    }
  }

  async function complete() {
    if (!session) return;
    setCompleteError("");
    try {
      const response = await completeSession.mutateAsync({
        sessionId: session.id,
      });
      setSession(response);
      setCompleted(true);
    } catch {
      setCompleteError(
        "We couldn’t confirm completion. The session remains active; nothing was auto-completed.",
      );
    }
  }

  return (
    <AuthGate title="Workout session" badge="TRACKING">
      {!validPlanId ? (
        <Card>
          <Icon name="alert-circle" color={p.error} size={26} />
          <Text style={styles.title}>This workout link is incomplete.</Text>
          <Body style={{ marginTop: 8, marginBottom: 19 }}>
            Open a workout from your plan so we can load the exact exercises and
            targets.
          </Body>
          <Button
            title="Back to workouts"
            onPress={() => router.replace("/(tabs)/workouts")}
            icon="arrow-left"
          />
        </Card>
      ) : plan.isLoading ? (
        <TrackingLoading label="Loading your workout plan…" />
      ) : plan.isError ? (
        <TrackingQueryError
          onRetry={() => void plan.refetch()}
          message="We couldn’t load this workout plan."
        />
      ) : !plan.data ? (
        <TrackingQueryError
          onRetry={() => void plan.refetch()}
          message="This workout plan is unavailable."
        />
      ) : completed ? (
        <CompletionState />
      ) : session ? (
        <ActiveWorkout
          plan={plan.data}
          session={session}
          isCompleting={completeSession.isPending}
          error={completeError}
          onComplete={() => void complete()}
        />
      ) : (
        <PlannedWorkout
          plan={plan.data}
          isStarting={startSession.isPending}
          error={startError}
          onStart={() => void start()}
          onRetry={() => void start()}
          onNew={() => {
            setClientId(null);
            setStartError("");
          }}
        />
      )}
    </AuthGate>
  );
}

function PlannedWorkout({
  plan,
  isStarting,
  error,
  onStart,
  onRetry,
  onNew,
}: {
  plan: WorkoutPlan;
  isStarting: boolean;
  error: string;
  onStart: () => void;
  onRetry: () => void;
  onNew: () => void;
}) {
  return (
    <>
      <Text style={styles.heading}>{plan.title}</Text>
      <Body style={{ marginBottom: 20 }}>
        Review the targets, instructions, equipment and rest before you begin.
      </Body>
      <Card>
        <Section title="Exercises" />
        {plan.exercises.length ? (
          <View style={styles.exerciseList}>
            {plan.exercises.map((exercise: PlanExercise, index: number) => (
              <ExerciseDetails
                key={exercise.id}
                index={index}
                exercise={exercise}
              />
            ))}
          </View>
        ) : (
          <Body>No exercises are listed in this plan yet.</Body>
        )}
        <View style={{ marginTop: 21 }}>
          <Button
            title={isStarting ? "Starting securely…" : "Start this workout"}
            onPress={onStart}
            disabled={isStarting}
            icon="play"
          />
        </View>
      </Card>
      {error ? (
        <SubmissionError
          message={error}
          onRetry={onRetry}
          onNew={onNew}
          retryTitle="Retry start"
          newTitle="Use a new start request"
        />
      ) : null}
    </>
  );
}

function ActiveWorkout({
  plan,
  session,
  isCompleting,
  error,
  onComplete,
}: {
  plan: WorkoutPlan;
  session: WorkoutSession;
  isCompleting: boolean;
  error: string;
  onComplete: () => void;
}) {
  const logSet = trpc.workouts.logSet.useMutation();
  const replaceExercise = trpc.workouts.replaceExercise.useMutation();
  const skipExercise = trpc.workouts.skipExercise.useMutation();
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);
  const [actionError, setActionError] = useState("");
  const exercise = plan.exercises[exerciseIndex];
  const exerciseId = exercise?.id;
  const exerciseLogs = useMemo(
    () => loggedSets.filter((item) => item.exerciseId === exerciseId),
    [exerciseId, loggedSets],
  );

  async function saveSet() {
    if (!exerciseId) return;
    const parsedReps = Number(reps);
    const parsedWeight = Number(weight || 0);
    if (
      !Number.isInteger(parsedReps) ||
      parsedReps < 1 ||
      !Number.isFinite(parsedWeight) ||
      parsedWeight < 0
    ) {
      setActionError("Enter valid positive reps and a weight of zero or more.");
      return;
    }
    setActionError("");
    try {
      const response = await logSet.mutateAsync({
        sessionId: session.id,
        exerciseId,
        setNumber: exerciseLogs.length + 1,
        reps: parsedReps,
        weightKg: parsedWeight,
        clientId: Crypto.randomUUID(),
      });
      setLoggedSets((current) => [...current, response]);
      setReps("");
      setWeight("");
    } catch {
      setActionError(
        "We couldn’t save that set. Your session is still active; retry when ready.",
      );
    }
  }

  async function skip() {
    if (!exerciseId) return;
    setActionError("");
    try {
      await skipExercise.mutateAsync({ sessionId: session.id, exerciseId });
      setExerciseIndex((value) =>
        Math.min(value + 1, plan.exercises.length - 1),
      );
    } catch {
      setActionError(
        "We couldn’t skip this exercise. Nothing was changed; retry when ready.",
      );
    }
  }

  async function replace() {
    const replacement = plan.exercises[exerciseIndex + 1];
    if (!exerciseId || !replacement) {
      setActionError(
        "There is no replacement exercise available in this plan.",
      );
      return;
    }
    setActionError("");
    try {
      await replaceExercise.mutateAsync({
        sessionId: session.id,
        exerciseId,
        replacementExerciseId: replacement.id,
      });
      setExerciseIndex((value) =>
        Math.min(value + 1, plan.exercises.length - 1),
      );
    } catch {
      setActionError(
        "We couldn’t replace this exercise. Nothing was changed; retry when ready.",
      );
    }
  }

  return (
    <>
      <Text style={styles.heading}>{plan.title}</Text>
      <Body style={{ marginBottom: 20 }}>
        Session started {formatDate(session.startedAt)}. Your saved sets are
        written to this session.
      </Body>
      <Card style={styles.activeCard}>
        <View style={styles.activeHeader}>
          <View style={styles.liveIcon}>
            <Icon name="activity" color={p.green} size={21} />
          </View>
          <View style={{ flex: 1 }}>
            <Label>ACTIVE SESSION</Label>
            <Text style={styles.meta}>Session #{session.id}</Text>
          </View>
        </View>
        <Section
          title={`Exercise ${exerciseIndex + 1} of ${plan.exercises.length}`}
        />
        {exercise ? (
          <View>
            <ExerciseDetails index={exerciseIndex} exercise={exercise} />
            <Text style={styles.setPrompt}>Log what you actually lifted.</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={reps}
                onChangeText={setReps}
                placeholder="Reps"
                placeholderTextColor={p.muted}
                keyboardType="numeric"
                style={styles.setInput}
                accessibilityLabel="Repetitions"
              />
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="Weight kg"
                placeholderTextColor={p.muted}
                keyboardType="decimal-pad"
                style={styles.setInput}
                accessibilityLabel="Weight in kilograms"
              />
            </View>
            <Button
              title={logSet.isPending ? "Saving set…" : "Save set"}
              onPress={() => void saveSet()}
              disabled={logSet.isPending || !reps.trim()}
              icon="save"
            />
            <View style={{ height: 10 }} />
            <View style={styles.inlineActions}>
              <Button
                title="Skip exercise"
                onPress={() => void skip()}
                disabled={skipExercise.isPending}
                secondary
                icon="skip-forward"
              />
              <Button
                title="Replace"
                onPress={() => void replace()}
                disabled={replaceExercise.isPending}
                secondary
                icon="repeat"
              />
            </View>
            <Body style={{ marginTop: 12 }}>
              {exerciseLogs.length} set{exerciseLogs.length === 1 ? "" : "s"}{" "}
              saved on the server for this exercise.
            </Body>
          </View>
        ) : (
          <Body>No exercises were saved for this session.</Body>
        )}
        {actionError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {actionError}
          </Text>
        ) : null}
        <View style={{ marginTop: 20 }}>
          <Button
            title={
              isCompleting ? "Confirming completion…" : "Mark workout complete"
            }
            onPress={onComplete}
            disabled={isCompleting}
            icon="check"
          />
        </View>
      </Card>
      {error ? (
        <SubmissionError
          message={error}
          onRetry={onComplete}
          onNew={() => undefined}
          retryTitle="Retry completion"
          newTitle="Keep session active"
        />
      ) : null}
      <Body style={styles.privacyNote}>
        Completion is recorded only when you press the button above. There is no
        timer or automatic completion.
      </Body>
    </>
  );
}

function ExerciseDetails({
  index,
  exercise,
}: {
  index: number;
  exercise: PlanExercise;
}) {
  const snapshot = exercise.snapshot;
  return (
    <View style={styles.detailBlock}>
      <View style={styles.exerciseRow}>
        <View style={styles.exerciseNumber}>
          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{snapshot.name}</Text>
          <Text style={styles.exerciseMeta}>
            {snapshot.defaultSets} sets · {snapshot.defaultReps} reps ·{" "}
            {snapshot.defaultRestSeconds}s rest
          </Text>
        </View>
      </View>
      <Text style={styles.detailText}>
        Target muscles: {snapshot.targetMuscles.join(", ")}
      </Text>
      <Text style={styles.detailText}>
        Equipment: {snapshot.equipment.join(", ") || "bodyweight"}
      </Text>
      <Text style={styles.detailText}>{snapshot.instructions}</Text>
      {snapshot.demonstration?.url ? (
        <Text style={styles.demo}>
          Demonstration: {snapshot.demonstration.provider ?? "video"} ·{" "}
          {snapshot.demonstration.url}
        </Text>
      ) : null}
    </View>
  );
}

function CompletionState() {
  return (
    <Card>
      <View style={styles.successIcon}>
        <Icon name="check" color={p.green} size={27} />
      </View>
      <Text style={styles.title}>Workout completed.</Text>
      <Body style={{ marginTop: 8, marginBottom: 20 }}>
        Nice work. Your completion was written only after your explicit action.
      </Body>
      <Button
        title="Back to home"
        onPress={() => router.replace("/(tabs)")}
        icon="home"
      />
      <View style={{ height: 10 }} />
      <Button
        title="View workout summary"
        onPress={() => router.back()}
        secondary
        icon="arrow-left"
      />
    </Card>
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
  activeCard: { borderColor: p.greenDark },
  activeHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  liveIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: p.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { color: p.muted, fontSize: 11, marginTop: 6 },
  exerciseList: { gap: 9 },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: p.border,
  },
  exerciseNumber: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: p.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseNumberText: { color: p.green, fontSize: 12, fontWeight: "700" },
  exerciseName: { color: p.text, fontSize: 13, fontWeight: "600" },
  exerciseMeta: { color: p.muted, fontSize: 10, marginTop: 4 },
  detailBlock: { marginBottom: 8 },
  detailText: { color: p.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  demo: { color: p.green, fontSize: 11, lineHeight: 17, marginTop: 5 },
  setPrompt: {
    color: p.text,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 9,
  },
  inputRow: { flexDirection: "row", gap: 9, marginBottom: 10 },
  setInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.background,
    color: p.text,
    paddingHorizontal: 13,
  },
  inlineActions: { gap: 9 },
  error: { color: p.error, marginTop: 10, lineHeight: 18, fontSize: 12 },
  successIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: p.greenDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  privacyNote: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 18,
    paddingHorizontal: 2,
  },
});
