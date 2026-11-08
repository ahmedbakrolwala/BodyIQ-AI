import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as Crypto from "expo-crypto";
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
import { useRefreshTracking, useTrackingSummary } from "@/lib/tracking-client";
import { trpc } from "@/lib/trpc";
import type { FitnessExercise, FitnessWorkoutPlan } from "@/shared/fitness";
import type { WorkoutRecord } from "@/shared/tracking";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
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
  const summary = useTrackingSummary();
  const refreshTracking = useRefreshTracking();
  const startWorkout = trpc.tracking.startWorkout.useMutation();
  const completeWorkout = trpc.tracking.completeWorkout.useMutation();
  const [startClientId, setStartClientId] = useState<string | null>(null);
  const [startError, setStartError] = useState("");
  const [completeError, setCompleteError] = useState("");
  const [completed, setCompleted] = useState(false);

  const data = summary.data;
  const activeWorkout =
    data?.todayWorkout?.completedAt === null ? data.todayWorkout : null;

  async function start() {
    setStartError("");
    const clientId = startClientId ?? Crypto.randomUUID();
    setStartClientId(clientId);
    try {
      await startWorkout.mutateAsync({
        clientId,
        timeZone: data?.timeZone ?? "UTC",
      });
      await refreshTracking();
      setStartClientId(null);
    } catch {
      setStartError(
        "We couldn’t confirm the session start. It has not been reported as started; retry to safely check the same request.",
      );
    }
  }

  async function complete(id: number) {
    setCompleteError("");
    try {
      await completeWorkout.mutateAsync({ id });
      await refreshTracking();
      setCompleted(true);
    } catch {
      setCompleteError(
        "We couldn’t confirm completion. The session remains active; nothing was auto-completed.",
      );
    }
  }

  return (
    <AuthGate title="Workout session" badge="TRACKING">
      {summary.isLoading ? (
        <TrackingLoading label="Loading your workout plan…" />
      ) : summary.isError ? (
        <TrackingQueryError onRetry={() => void summary.refetch()} />
      ) : !data ? (
        <Card>
          <Icon name="activity" color={p.green} size={26} />
          <Text style={styles.title}>Your workout plan is not ready.</Text>
          <Body style={{ marginTop: 8, marginBottom: 19 }}>
            Complete your fitness profile to unlock a plan. We will never invent
            a placeholder session or duration here.
          </Body>
          <Button
            title="Open fitness onboarding"
            onPress={() => router.push("/onboarding")}
            icon="arrow-right"
          />
        </Card>
      ) : completed ? (
        <CompletionState />
      ) : activeWorkout ? (
        <ActiveWorkout
          workout={activeWorkout}
          isCompleting={completeWorkout.isPending}
          error={completeError}
          onComplete={() => void complete(activeWorkout.id)}
        />
      ) : data.plannedWorkout ? (
        <PlannedWorkout
          plan={data.plannedWorkout}
          weekly={data.weekly}
          isStarting={startWorkout.isPending}
          error={startError}
          onStart={() => void start()}
          onRetry={() => void start()}
          onNew={() => {
            setStartClientId(null);
            setStartError("");
          }}
        />
      ) : (
        <Card>
          <Icon name="calendar" color={p.green} size={26} />
          <Text style={styles.title}>No workout plan yet.</Text>
          <Body style={{ marginTop: 8, marginBottom: 19 }}>
            Finish your fitness onboarding to create a plan for your goals and
            equipment.
          </Body>
          <Button
            title="Complete fitness onboarding"
            onPress={() => router.push("/onboarding")}
            icon="arrow-right"
          />
        </Card>
      )}
    </AuthGate>
  );
}

function ActiveWorkout({
  workout,
  isCompleting,
  error,
  onComplete,
}: {
  workout: WorkoutRecord;
  isCompleting: boolean;
  error: string;
  onComplete: () => void;
}) {
  return (
    <>
      <Text style={styles.heading}>{workout.name}</Text>
      <Body style={{ marginBottom: 20 }}>
        This session is still active. It stays here until you explicitly mark it
        complete, even if it began on an earlier day.
      </Body>
      <Card style={styles.activeCard}>
        <View style={styles.activeHeader}>
          <View style={styles.liveIcon}>
            <Icon name="activity" color={p.green} size={21} />
          </View>
          <View style={{ flex: 1 }}>
            <Label>ACTIVE SESSION</Label>
            <Text style={styles.meta}>
              Started {formatDate(workout.startedAt)}
            </Text>
          </View>
        </View>
        <Section title="Saved exercises" />
        {workout.exercises.length ? (
          <View style={styles.exerciseList}>
            {workout.exercises.map((exercise, index) => (
              <ExerciseRow
                key={`${exercise.name}-${index}`}
                index={index}
                exercise={exercise}
              />
            ))}
          </View>
        ) : (
          <Body>No exercises were saved for this session.</Body>
        )}
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

function PlannedWorkout({
  plan,
  weekly,
  isStarting,
  error,
  onStart,
  onRetry,
  onNew,
}: {
  plan: FitnessWorkoutPlan;
  weekly: {
    completedSessions: number;
    completedDays: number;
    targetDays: number | null;
  };
  isStarting: boolean;
  error: string;
  onStart: () => void;
  onRetry: () => void;
  onNew: () => void;
}) {
  return (
    <>
      <Text style={styles.heading}>{plan.title}</Text>
      <Body style={{ marginBottom: 20 }}>{plan.note}</Body>
      <Card>
        <View style={styles.planHeader}>
          <Icon name="calendar" color={p.green} size={20} />
          <View style={{ flex: 1 }}>
            <Label>PLANNED SESSION</Label>
            <Text style={styles.weeklyText}>
              {weekly.completedSessions} completed session
              {weekly.completedSessions === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
        <Section title="Exercises" />
        {plan.exercises.length ? (
          <View style={styles.exerciseList}>
            {plan.exercises.map((exercise, index) => (
              <ExerciseRow
                key={`${exercise.name}-${index}`}
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

function ExerciseRow({
  index,
  exercise,
}: {
  index: number;
  exercise: FitnessExercise;
}) {
  return (
    <View style={styles.exerciseRow}>
      <View style={styles.exerciseNumber}>
        <Text style={styles.exerciseNumberText}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.exerciseMeta}>
          {exercise.sets} sets · {exercise.reps} reps
        </Text>
      </View>
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
  planHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  weeklyText: { color: p.text, fontSize: 14, fontWeight: "600", marginTop: 6 },
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
