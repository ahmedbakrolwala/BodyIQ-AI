import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Badge, Body, Button, Card, Label, Section } from "./ui";
import { palette as p } from "@/constants/design";
const labels: Record<string, string> = {
  muscle_gain: "Muscle gain",
  fat_loss: "Fat loss",
  maintenance: "Maintenance",
  strength: "Strength",
  general_fitness: "General fitness",
};
export function FitnessPersonalization({
  section = "home",
}: {
  section?: "home" | "nutrition" | "workouts";
}) {
  const auth = useAuth();
  const query = trpc.fitness.get.useQuery(undefined, {
    enabled: auth.isAuthenticated,
    retry: false,
  });
  if (auth.loading)
    return (
      <Card style={{ marginBottom: 20 }}>
        <ActivityIndicator color={p.green} />
      </Card>
    );
  if (!auth.isAuthenticated)
    return (
      <Card style={{ marginBottom: 20 }}>
        <Badge text="YOUR BODYIQ BASELINE" />
        <Text
          style={{
            color: p.text,
            fontWeight: "700",
            fontSize: 22,
            marginVertical: 12,
          }}
        >
          A plan that starts with you.
        </Text>
        <Body style={{ marginBottom: 18 }}>
          Tell us your goals, routine and food preferences to build your private
          fitness profile.
        </Body>
        <Button
          title="Start fitness onboarding"
          onPress={() => router.push("/onboarding")}
          icon="arrow-right"
        />
      </Card>
    );
  if (query.isLoading)
    return (
      <Card style={{ marginBottom: 20 }}>
        <ActivityIndicator color={p.green} />
        <Body>Loading your saved fitness profile…</Body>
      </Card>
    );
  if (query.isError)
    return (
      <Card style={{ marginBottom: 20 }}>
        <Body style={{ marginBottom: 12 }}>
          Your saved profile could not be loaded. We won’t substitute sample
          data for your recommendations.
        </Body>
        <Button
          title="Retry profile connection"
          onPress={() => void query.refetch()}
          secondary
        />
      </Card>
    );
  if (!query.data)
    return (
      <Card style={{ marginBottom: 20 }}>
        <Badge text="COMPLETE YOUR FITNESS PROFILE" />
        <Text
          style={{
            color: p.text,
            fontWeight: "700",
            fontSize: 22,
            marginVertical: 12,
          }}
        >
          Your goals. A clearer plan.
        </Text>
        <Body style={{ marginBottom: 18 }}>
          Five short steps unlock estimated daily targets and guidance tailored
          to your equipment and diet.
        </Body>
        <Button
          title="Set up my fitness profile"
          onPress={() => router.push("/onboarding")}
          icon="arrow-right"
        />
      </Card>
    );
  const { profile, targets, mealPlan, workoutPlan } = query.data;
  return (
    <Card style={{ marginBottom: 22, borderColor: p.greenDark }}>
      <Badge text="YOUR SAVED PROFILE · NOT SAMPLE DATA" />
      <Text
        style={{
          color: p.text,
          fontSize: 22,
          fontWeight: "700",
          marginTop: 14,
        }}
      >
        {section === "nutrition"
          ? "Food that fits your routine."
          : section === "workouts"
            ? "Train with what you have."
            : `${labels[profile.primaryGoal] ?? "Your fitness"} starts here.`}
      </Text>
      <Body style={{ fontSize: 12, marginTop: 10 }}>
        {profile.workoutLocation === "gym" ? "Gym" : "Home"} training ·{" "}
        {profile.experience} · {profile.dietaryPreference}
      </Body>
      {section !== "workouts" && (
        <>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 20,
              marginVertical: 18,
            }}
          >
            {[
              ["Estimated kcal", targets.calories],
              ["Protein g", targets.proteinG],
              ["Carbs g", targets.carbsG],
              ["Fat g", targets.fatG],
            ].map(([title, value]) => (
              <View key={String(title)}>
                <Label>{String(title)}</Label>
                <Text
                  style={{
                    color: p.green,
                    fontWeight: "700",
                    fontSize: 22,
                    marginTop: 6,
                  }}
                >
                  {value ?? "—"}
                </Text>
              </View>
            ))}
          </View>
          <Body style={{ fontSize: 11, lineHeight: 18 }}>{targets.note}</Body>
        </>
      )}
      {section === "nutrition" && (
        <>
          <Section title="Your meal-plan ideas" />
          <Body style={{ fontSize: 11, marginBottom: 12 }}>
            Suggestions, not logged meals. Check ingredient labels and
            cross-contact risks before preparing food.
          </Body>
          {mealPlan.length ? (
            mealPlan.map((meal, index) => (
              <View
                key={`${meal.name}-${index}`}
                style={{
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: p.border,
                }}
              >
                <Text style={{ color: p.text, fontWeight: "600" }}>
                  {meal.name}
                </Text>
                <Body style={{ fontSize: 12, marginTop: 6 }}>
                  {meal.ingredients.join(", ")}
                </Body>
                <Body style={{ fontSize: 11, marginTop: 5 }}>{meal.note}</Body>
              </View>
            ))
          ) : (
            <Body>
              No suitable meal ideas are shown for your recorded allergies.
              Review your profile and seek qualified dietary guidance; nothing
              is represented as allergy-safe.
            </Body>
          )}
        </>
      )}
      {section !== "nutrition" && (
        <>
          <Section title={workoutPlan.title} />
          <Body style={{ fontSize: 12, marginBottom: 12 }}>
            {workoutPlan.daysPerWeek} days per week · Guidance based on your
            experience and available equipment
          </Body>
          {section === "workouts" &&
            workoutPlan.exercises.map((exercise, index) => (
              <View
                key={`${exercise.name}-${index}`}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: p.border,
                }}
              >
                <Text style={{ flex: 1, color: p.text, fontSize: 13 }}>
                  {exercise.name}
                </Text>
                <Body style={{ fontSize: 12 }}>
                  {exercise.sets} × {exercise.reps}
                </Body>
              </View>
            ))}
          <Body style={{ fontSize: 11, lineHeight: 18 }}>
            {workoutPlan.note}
          </Body>
        </>
      )}
      <View style={{ height: 18 }} />
      <Button
        title="View or edit my fitness profile"
        secondary
        icon="user"
        onPress={() => router.push("/fitness-profile")}
      />
    </Card>
  );
}
