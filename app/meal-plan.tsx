import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import {
  AuthGate,
  TrackingQueryError,
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
import { trpc } from "@/lib/trpc";
const durations = [1, 7, 30] as const;
export default function MealPlanScreen() {
  return (
    <AuthGate title="Meal plans" badge="NUTRITION">
      <MealPlanBuilder />
    </AuthGate>
  );
}
function MealPlanBuilder() {
  const params = useLocalSearchParams<{ planId?: string }>();
  const [durationDays, setDuration] = useState<(typeof durations)[number]>(7);
  const [cuisine, setCuisine] = useState<"indian" | "international" | "mixed">(
    "mixed",
  );
  const [budget, setBudget] = useState<"low" | "standard" | "flexible">(
    "standard",
  );
  const [dietaryMode, setDiet] = useState<
    "profile" | "vegetarian" | "non_vegetarian"
  >("profile");
  const create = trpc.nutrition.createMealPlan.useMutation();
  const saved = trpc.nutrition.listMealPlans.useQuery(
    { limit: 10 },
    { retry: false },
  );
  const selected = Number(params.planId);
  const detail = trpc.nutrition.getMealPlan.useQuery(
    { planId: selected },
    { enabled: Number.isInteger(selected) && selected > 0, retry: false },
  );
  const plan = create.data ?? detail.data;
  return (
    <>
      {!plan ? (
        <>
          <Body style={{ marginBottom: 18 }}>
            Build an approximate plan from your saved profile, cuisine, budget,
            and dietary mode.
          </Body>
          <Card>
            <Label>DURATION</Label>
            <View style={styles.options}>
              {durations.map((v) => (
                <Choice
                  key={v}
                  label={`${v} day${v === 1 ? "" : "s"}`}
                  selected={durationDays === v}
                  onPress={() => setDuration(v)}
                />
              ))}
            </View>
            <Label>CUISINE</Label>
            <View style={styles.options}>
              {["mixed", "indian", "international"].map((v) => (
                <Choice
                  key={v}
                  label={v}
                  selected={cuisine === v}
                  onPress={() => setCuisine(v as typeof cuisine)}
                />
              ))}
            </View>
            <Label>BUDGET</Label>
            <View style={styles.options}>
              {["low", "standard", "flexible"].map((v) => (
                <Choice
                  key={v}
                  label={v}
                  selected={budget === v}
                  onPress={() => setBudget(v as typeof budget)}
                />
              ))}
            </View>
            <Label>DIETARY MODE</Label>
            <View style={styles.options}>
              {[
                ["profile", "Use my profile"],
                ["vegetarian", "Vegetarian"],
                ["non_vegetarian", "Non-vegetarian"],
              ].map(([v, label]) => (
                <Choice
                  key={v}
                  label={label}
                  selected={dietaryMode === v}
                  onPress={() => setDiet(v as typeof dietaryMode)}
                />
              ))}
            </View>
            <Button
              title={create.isPending ? "Building…" : "Create meal plan"}
              disabled={create.isPending}
              icon="star"
              onPress={() =>
                void create.mutateAsync({
                  durationDays,
                  cuisine,
                  budget,
                  dietaryMode,
                })
              }
            />
          </Card>
          {create.isError && (
            <TrackingQueryError
              onRetry={() => void create.reset()}
              message={create.error.message}
            />
          )}
          <Section title="Saved plans" />
          {saved.isLoading ? (
            <ActivityIndicator color={p.green} />
          ) : saved.isError ? (
            <TrackingQueryError onRetry={() => void saved.refetch()} />
          ) : (
            saved.data?.map((item) => (
              <Card key={item.id}>
                <Text style={styles.title}>
                  {item.durationDays}-day {item.cuisine} plan
                </Text>
                <Body>
                  {new Date(item.createdAt).toLocaleDateString()} · approximate
                </Body>
                <Button
                  title="Open plan"
                  secondary
                  icon="arrow-right"
                  onPress={() => router.setParams({ planId: String(item.id) })}
                />
              </Card>
            ))
          )}
        </>
      ) : (
        <PlanDetail plan={plan} />
      )}
    </>
  );
}
function PlanDetail({ plan }: { plan: any }) {
  return (
    <>
      <Card>
        <Text style={styles.title}>{plan.durationDays}-day plan saved.</Text>
        <Body>{plan.note}</Body>
        <View style={styles.metrics}>
          <Text style={styles.metric}>
            {Math.round(plan.target.calories)} kcal target
          </Text>
          <Text style={styles.metric}>
            P {Math.round(plan.target.proteinG)}g
          </Text>
          <Text style={styles.metric}>
            ₹
            {plan.meals
              .reduce((sum: number, m: any) => sum + m.estimatedCostInr, 0)
              .toFixed(0)}{" "}
            est.
          </Text>
        </View>
        <Button
          title="Open grocery list"
          icon="shopping-cart"
          onPress={() =>
            router.push({
              pathname: "/grocery-list",
              params: { planId: String(plan.id) },
            })
          }
        />
      </Card>
      <Section title="Plan meals" />
      {Array.from({ length: plan.durationDays }, (_, i) => (
        <Card key={i}>
          <Text style={styles.title}>Day {i + 1}</Text>
          {plan.meals
            .filter((m: any) => m.day === i + 1)
            .map((m: any) => (
              <View key={m.id} style={styles.meal}>
                <Text style={styles.mealName}>
                  {m.mealType} · {m.food.name}
                </Text>
                <Body>
                  {m.food.ingredients
                    .map((x: any) => `${x.quantity}${x.unit} ${x.name}`)
                    .join(", ")}
                </Body>
                <Body>
                  {m.food.nutrition.calories} kcal · ₹{m.estimatedCostInr}{" "}
                  estimated
                </Body>
              </View>
            ))}
        </Card>
      ))}
    </>
  );
}
const styles = StyleSheet.create({
  options: { gap: 8, marginVertical: 10 },
  title: { color: p.text, fontSize: 17, fontWeight: "700", marginBottom: 7 },
  metrics: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 16,
    flexWrap: "wrap",
  },
  metric: { color: p.green, fontSize: 12 },
  meal: { borderTopWidth: 1, borderTopColor: p.border, paddingVertical: 10 },
  mealName: { color: p.text, fontWeight: "600", textTransform: "capitalize" },
});
