import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useTrackingSummary } from "@/lib/tracking-client";
import { trpc } from "@/lib/trpc";
import { palette as p } from "@/constants/design";
import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  Icon,
  Label,
  Section,
} from "@/components/bodyiq/ui";
import { Meter } from "@/components/bodyiq/premium";
import { TrackingQueryError } from "@/components/bodyiq/tracking-form";
import type { CatalogFood } from "@/shared/nutrition";

const TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export default function NutritionReal() {
  const auth = useAuth();
  const query = useTrackingSummary();
  const { refetch } = query;
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState<"mixed" | "indian" | "international">(
    "mixed",
  );
  const foods = trpc.nutrition.searchFoods.useQuery(
    { query: search, cuisine, limit: 12 },
    { enabled: auth.isAuthenticated && searchOpen, retry: false },
  );
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  if (!auth.isAuthenticated) return null;
  if (query.isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={p.green} />
        <Body style={{ marginTop: 12 }}>Loading your nutrition record…</Body>
      </View>
    );
  if (query.isError)
    return <TrackingQueryError onRetry={() => void refetch()} />;
  const data = query.data;
  if (!data) return null;
  const target = data.targets?.calories ?? 0;
  return (
    <>
      <View style={styles.quickRow}>
        <Button
          title="Log manually"
          icon="edit-3"
          onPress={() => router.push("/log-meal")}
        />
        <Button
          title="Scan"
          icon="camera"
          secondary
          onPress={() => router.push("/scanner")}
        />
      </View>
      <Card>
        <View style={styles.row}>
          <Label>{data.dayLabel.toUpperCase()}’S BALANCE</Label>
          <Badge text="LIVE RECORD" />
        </View>
        <View style={styles.balance}>
          <View style={{ flex: 1 }}>
            <Text style={styles.calories}>
              {data.consumed.calories.toLocaleString()}{" "}
              <Text style={styles.unit}>kcal</Text>
            </Text>
            <Body>
              {target
                ? `of ${target.toLocaleString()} kcal target`
                : "No calorie target set"}
            </Body>
            <Body style={{ marginTop: 8 }}>
              {data.meals.length} logged meal
              {data.meals.length === 1 ? "" : "s"}
            </Body>
          </View>
        </View>
        <View style={styles.macros}>
          {(
            [
              [
                "Protein",
                data.consumed.proteinG,
                data.targets?.proteinG ?? 0,
                p.green,
              ],
              [
                "Carbs",
                data.consumed.carbsG,
                data.targets?.carbsG ?? 0,
                "#B99BEA",
              ],
              ["Fat", data.consumed.fatG, data.targets?.fatG ?? 0, p.orange],
            ] as const
          ).map(([label, value, goal, color]) => (
            <View key={label} style={{ flex: 1, gap: 7 }}>
              <Text style={styles.macroLabel}>{label}</Text>
              <Text style={styles.macro}>
                {Math.round(value)}{" "}
                <Text style={styles.unit}>
                  / {goal ? Math.round(goal) : "—"}g
                </Text>
              </Text>
              {goal ? (
                <Meter value={value} goal={goal} color={color} height={4} />
              ) : (
                <View style={{ height: 4, backgroundColor: p.border }} />
              )}
            </View>
          ))}
        </View>
      </Card>
      <Section title="Quick actions" />
      <View style={styles.quickGrid}>
        <Button
          title="Food search"
          icon="search"
          secondary
          onPress={() => setSearchOpen((v) => !v)}
        />
        <Button
          title="Meal plans"
          icon="calendar"
          secondary
          onPress={() => router.push("/meal-plan")}
        />
      </View>
      {searchOpen && (
        <FoodSearch
          query={search}
          setQuery={setSearch}
          cuisine={cuisine}
          setCuisine={setCuisine}
          foods={foods.data ?? []}
          loading={foods.isLoading}
          error={foods.isError}
          onRetry={() => void foods.refetch()}
        />
      )}
      <Section
        title="Your daily plate"
        action="Add meal"
        onPress={() => router.push("/log-meal")}
      />
      {data.meals.length === 0 ? (
        <Card>
          <EmptyState
            icon="clipboard"
            title="No meals logged today."
            description="Your authenticated record will appear here after you add a meal."
          />
        </Card>
      ) : (
        TYPES.map((type) => {
          const meals = data.meals.filter((m) => m.mealType === type);
          return (
            <View key={type} style={{ marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>{type.toUpperCase()}</Text>
              {meals.length ? (
                meals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    refresh={() => void refetch()}
                  />
                ))
              ) : (
                <Body style={{ fontSize: 11 }}>Nothing logged.</Body>
              )}
            </View>
          );
        })
      )}
      <Body style={styles.note}>
        Nutrition amounts are your saved entries. Catalog and scanner values are
        estimates and should be checked against your source, allergies, and
        profile.
      </Body>
    </>
  );
}
function MealCard({ meal, refresh }: { meal: any; refresh: () => void }) {
  const del = trpc.tracking.deleteMeal.useMutation();
  const confirm = () => {
    const remove = async () => {
      try {
        await del.mutateAsync({ id: meal.id });
        refresh();
      } catch {
        Alert.alert(
          "Couldn’t delete meal",
          "Check your connection and try again.",
        );
      }
    };
    if (typeof window !== "undefined" && window.confirm) {
      if (window.confirm(`Delete ${meal.name}? This cannot be undone.`))
        void remove();
    } else
      Alert.alert(
        "Delete meal?",
        `Delete ${meal.name}? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => void remove(),
          },
        ],
      );
  };
  return (
    <Card style={styles.meal}>
      <View style={{ flex: 1 }}>
        <Text style={styles.mealName}>{meal.name}</Text>
        <Body style={{ fontSize: 11 }}>
          {Math.round(meal.calories)} kcal · {Math.round(meal.proteinG)}g
          protein ·{" "}
          {new Date(meal.recordedAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </Body>
        <Badge text="MANUAL / ESTIMATED" color={p.muted} />
      </View>
      <Pressable
        accessibilityLabel={`Edit ${meal.name}`}
        onPress={() =>
          router.push({
            pathname: "/log-meal",
            params: { editId: String(meal.id) },
          })
        }
        style={styles.icon}
      >
        <Icon name="edit-2" color={p.green} size={17} />
      </Pressable>
      <Pressable
        accessibilityLabel={`Delete ${meal.name}`}
        onPress={confirm}
        style={styles.icon}
      >
        <Icon name="trash-2" color={p.error} size={17} />
      </Pressable>
    </Card>
  );
}
function FoodSearch({
  query,
  setQuery,
  cuisine,
  setCuisine,
  foods,
  loading,
  error,
  onRetry,
}: {
  query: string;
  setQuery: (v: string) => void;
  cuisine: string;
  setCuisine: (v: any) => void;
  foods: CatalogFood[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <Card>
      <Text style={styles.searchTitle}>Catalog food search</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search dishes or ingredients"
        placeholderTextColor={p.muted}
        style={styles.input}
      />
      <View style={styles.filters}>
        {["mixed", "indian", "international"].map((v) => (
          <Pressable
            key={v}
            onPress={() => setCuisine(v)}
            style={[styles.filter, cuisine === v && styles.filterOn]}
          >
            <Text
              style={{ color: cuisine === v ? p.green : p.muted, fontSize: 11 }}
            >
              {v}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator color={p.green} />
      ) : error ? (
        <Button title="Retry search" icon="refresh-cw" onPress={onRetry} />
      ) : foods.length === 0 ? (
        <Body>No catalog matches yet.</Body>
      ) : (
        foods.map((food) => (
          <Pressable
            key={food.id}
            style={styles.result}
            onPress={() =>
              router.push({
                pathname: "/log-meal",
                params: {
                  catalog: JSON.stringify({
                    name: food.name,
                    calories: food.nutrition.calories,
                    protein: food.nutrition.proteinG,
                    carbs: food.nutrition.carbsG,
                    fat: food.nutrition.fatG,
                  }),
                },
              })
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.mealName}>{food.name}</Text>
              <Body style={{ fontSize: 11 }}>
                {food.nutrition.calories} kcal · P {food.nutrition.proteinG}g ·
                C {food.nutrition.carbsG}g · F {food.nutrition.fatG}g · ₹
                {food.estimatedCostInr}
              </Body>
              <Body style={{ fontSize: 10 }}>
                {food.dietTags.join(" · ")} ·{" "}
                {food.ingredients
                  .map((i) => `${i.quantity}${i.unit} ${i.name}`)
                  .join(", ")}
              </Body>
            </View>
            <Icon name="arrow-right" color={p.green} size={16} />
          </Pressable>
        ))
      )}
      <Body style={{ fontSize: 10, marginTop: 10 }}>
        Catalog nutrition and cost are estimates. Review ingredients for
        allergies and profile fit before logging.
      </Body>
    </Card>
  );
}
const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: 60 },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  quickGrid: { flexDirection: "row", gap: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balance: { marginVertical: 18 },
  calories: { color: p.text, fontSize: 34, fontWeight: "700" },
  unit: { color: p.muted, fontSize: 11, fontWeight: "400" },
  macros: {
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: p.border,
    paddingTop: 17,
  },
  macroLabel: { color: p.muted, fontSize: 11 },
  macro: { color: p.text, fontWeight: "600", fontSize: 16 },
  sectionTitle: {
    color: p.muted,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  meal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    padding: 14,
  },
  mealName: { color: p.text, fontWeight: "600", fontSize: 14, marginBottom: 5 },
  icon: { padding: 8 },
  note: { fontSize: 11, lineHeight: 17, marginTop: 14 },
  searchTitle: {
    color: p.text,
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 10,
  },
  input: {
    color: p.text,
    backgroundColor: p.background,
    borderColor: p.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
  },
  filters: { flexDirection: "row", gap: 7, marginBottom: 12 },
  filter: {
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 10,
    padding: 8,
  },
  filterOn: { borderColor: p.green, backgroundColor: p.greenDark },
  result: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: p.border,
  },
});
