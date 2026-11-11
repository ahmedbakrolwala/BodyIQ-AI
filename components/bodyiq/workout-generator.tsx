import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useTrackingSummary } from "@/lib/tracking-client";
import { useAuth } from "@/hooks/use-auth";
import { palette as p } from "@/constants/design";
import {
  Body,
  Button,
  Card,
  Choice,
  EmptyState,
  Icon,
  Label,
  Section,
  Segmented,
} from "@/components/bodyiq/ui";
import {
  TrackingLoading,
  TrackingQueryError,
} from "@/components/bodyiq/tracking-form";
import type { FitnessExercise } from "@/shared/fitness";

export type WorkoutGoal =
  | "muscle_gain"
  | "fat_loss"
  | "strength"
  | "general_fitness";
export type WorkoutLocation = "gym" | "home";
export type WorkoutSplit =
  | "full_body"
  | "upper_lower"
  | "push_pull_legs"
  | "muscle_group";

const goalLabels: Record<WorkoutGoal, string> = {
  muscle_gain: "Muscle gain",
  fat_loss: "Fat loss",
  strength: "Strength",
  general_fitness: "General fitness",
};
const splitLabels: Record<WorkoutSplit, string> = {
  full_body: "Full body",
  upper_lower: "Upper / lower",
  push_pull_legs: "Push / pull / legs",
  muscle_group: "Muscle group",
};
const muscles = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"];

export function WorkoutGenerator() {
  const auth = useAuth();
  const summary = useTrackingSummary();
  const [goal, setGoal] = useState<WorkoutGoal>("general_fitness");
  const [location, setLocation] = useState<WorkoutLocation>("home");
  const [split, setSplit] = useState<WorkoutSplit>("full_body");
  const [muscle, setMuscle] = useState("Chest");
  const [generated, setGenerated] = useState(false);
  const [generatedExercises, setGeneratedExercises] = useState<
    FitnessExercise[]
  >([]);
  const [planId, setPlanId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const generatePlan = trpc.workouts.generatePlan.useMutation();
  const fitness = trpc.fitness.get.useQuery(undefined, {
    enabled: auth.isAuthenticated,
    retry: false,
  });
  const plan = summary.data?.plannedWorkout;
  if (summary.isLoading || fitness.isLoading)
    return <TrackingLoading label="Loading your goals and equipment…" />;
  if (summary.isError || fitness.isError)
    return (
      <TrackingQueryError
        onRetry={() => {
          void summary.refetch();
          void fitness.refetch();
        }}
        message="We couldn’t load your workout setup."
      />
    );
  if (!fitness.data?.profile)
    return (
      <Card>
        <EmptyState
          icon="clipboard"
          title="Finish your fitness profile first"
          description="Your goal, location and equipment keep workout guidance grounded. No workout is generated until your profile is saved."
        />
        <Button
          title="Open fitness profile"
          onPress={() => router.push("/fitness-profile")}
          icon="arrow-right"
        />
      </Card>
    );
  const profile = fitness.data.profile;
  const generate = async () => {
    setMessage("");
    try {
      const result = await generatePlan.mutateAsync({
        goal,
        location,
        split: split === "muscle_group" ? "individual_muscle_group" : split,
        muscleGroup:
          split === "muscle_group"
            ? (muscle.toLowerCase() as
                | "chest"
                | "back"
                | "shoulders"
                | "biceps"
                | "triceps"
                | "legs"
                | "glutes"
                | "hamstrings"
                | "calves"
                | "core")
            : null,
        equipment: profile.equipment.filter((item) =>
          [
            "bodyweight",
            "dumbbells",
            "barbell",
            "bench",
            "pullup_bar",
            "kettlebell",
            "resistance_bands",
          ].includes(item),
        ) as (
          | "bodyweight"
          | "dumbbells"
          | "barbell"
          | "bench"
          | "pullup_bar"
          | "kettlebell"
          | "resistance_bands"
        )[],
      });
      setPlanId(result.id);
      setGeneratedExercises(
        result.exercises.map(
          (item: {
            snapshot: {
              name: string;
              defaultSets: number;
              defaultReps: string;
            };
          }) => ({
            name: item.snapshot.name,
            sets: item.snapshot.defaultSets,
            reps: item.snapshot.defaultReps,
          }),
        ),
      );
    } catch {
      setMessage(
        "We couldn’t generate this plan. Your saved profile was not changed; retry when you’re ready.",
      );
      return;
    }
    if (!generatedExercises.length && plan?.exercises?.length)
      setGeneratedExercises(plan.exercises);
    setGenerated(true);
  };
  const shownExercises = generated ? generatedExercises : [];
  return (
    <View>
      <Section title="Build the session around your goal." />
      <Text style={styles.prompt}>Goal</Text>
      <View style={styles.choiceGrid}>
        {(Object.keys(goalLabels) as WorkoutGoal[]).map((value) => (
          <Choice
            key={value}
            label={goalLabels[value]}
            selected={goal === value}
            onPress={() => setGoal(value)}
          />
        ))}
      </View>
      <Text style={styles.prompt}>Where will you train?</Text>
      <Segmented
        options={["Home", "Gym"]}
        value={location === "home" ? "Home" : "Gym"}
        onChange={(v) => setLocation(v === "Home" ? "home" : "gym")}
      />
      <Text style={styles.prompt}>Session structure</Text>
      <View style={styles.choiceGrid}>
        {(Object.keys(splitLabels) as WorkoutSplit[]).map((value) => (
          <Choice
            key={value}
            label={splitLabels[value]}
            selected={split === value}
            onPress={() => setSplit(value)}
          />
        ))}
      </View>
      {split === "muscle_group" && (
        <>
          <Text style={styles.prompt}>Focus area</Text>
          <Segmented options={muscles} value={muscle} onChange={setMuscle} />
        </>
      )}
      <Card style={styles.context}>
        <View style={styles.contextIcon}>
          <Icon name="sliders" color={p.green} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Label>PROFILE CONTEXT</Label>
          <Body style={{ marginTop: 4 }}>
            {location === "gym" ? "Gym equipment" : "Home equipment"} ·{" "}
            {fitness.data.profile.equipment.length
              ? fitness.data.profile.equipment.join(", ")
              : "bodyweight only"}
          </Body>
        </View>
      </Card>
      <Button
        title={generated ? "Regenerate plan" : "Generate workout"}
        onPress={() => void generate()}
        icon="zap"
      />
      {message ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
      ) : null}
      {generated ? (
        <Review
          exercises={shownExercises}
          planId={planId}
          goal={goal}
          location={location}
          split={split}
        />
      ) : (
        <Body style={styles.hint}>
          Review the exercises before you start. We won’t save a session until
          you explicitly begin.
        </Body>
      )}
    </View>
  );
}
function Review({
  exercises,
  planId,
  goal,
  location,
  split,
}: {
  exercises: FitnessExercise[];
  planId: number | null;
  goal: WorkoutGoal;
  location: WorkoutLocation;
  split: WorkoutSplit;
}) {
  return (
    <>
      <Section title="Review your plan" />
      <Card>
        <View style={styles.reviewHeader}>
          <View style={{ flex: 1 }}>
            <Label>GENERATED FOR YOU</Label>
            <Text style={styles.planTitle}>
              {goalLabels[goal]} · {splitLabels[split]}
            </Text>
            <Body>
              {location === "gym" ? "Gym" : "Home"} training · profile equipment
              applied
            </Body>
          </View>
          <Icon name="check-circle" color={p.green} size={23} />
        </View>
        {exercises.length ? (
          exercises.map((exercise, index) => (
            <View key={`${exercise.name}-${index}`} style={styles.exercise}>
              <View style={styles.number}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.meta}>
                  {exercise.sets} sets · {exercise.reps} reps · equipment from
                  profile
                </Text>
                <Text style={styles.meta}>
                  Use controlled form; stop if something hurts.
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Body>
            No compatible exercises were returned for this setup. Adjust
            location or equipment and try again.
          </Body>
        )}
        <View style={{ marginTop: 16 }}>
          <Button
            title="Start this workout"
            onPress={() =>
              router.push(
                planId
                  ? `/workout-session?planId=${planId}`
                  : "/workout-session",
              )
            }
            icon="play"
          />
        </View>
      </Card>
    </>
  );
}
const styles = StyleSheet.create({
  prompt: {
    color: p.text,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 17,
    marginBottom: 9,
  },
  choiceGrid: { gap: 8 },
  context: { marginVertical: 18, flexDirection: "row", gap: 11, padding: 14 },
  contextIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: p.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 11, marginTop: 14 },
  error: { color: p.error, marginTop: 12, lineHeight: 18, fontSize: 12 },
  reviewHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 10,
  },
  planTitle: {
    color: p.text,
    fontSize: 17,
    fontWeight: "700",
    marginVertical: 7,
  },
  exercise: {
    flexDirection: "row",
    gap: 11,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: p.border,
  },
  number: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: p.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: { color: p.green, fontWeight: "700", fontSize: 12 },
  exerciseName: { color: p.text, fontSize: 13, fontWeight: "600" },
  meta: { color: p.muted, fontSize: 10, marginTop: 4 },
});
