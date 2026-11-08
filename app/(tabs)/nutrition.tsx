import { FitnessPersonalization } from "@/components/bodyiq/fitness-personalization";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { ActivityRing } from "@/components/bodyiq/charts";
import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  Header,
  Icon,
  IconName,
  Label,
  Screen,
  Section,
  Segmented,
} from "@/components/bodyiq/ui";
import { FoodImage, Meter } from "@/components/bodyiq/premium";
import { palette as p } from "@/constants/design";
import { sampleDay, sampleMeals } from "@/lib/sample-data";
import { useDesignPreview } from "@/lib/preview-context";

export default function NutritionScreen() {
  const { isPreview } = useDesignPreview();
  const { width } = useWindowDimensions();
  const [day, setDay] = useState("Today");
  const [water, setWater] = useState(sampleDay.water);
  const [selectedMeal, setSelectedMeal] = useState<
    (typeof sampleMeals)[number] | null
  >(null);

  const hasPreviewDay = isPreview && day === "Today";
  // Adjust transient demo state before committing a changed preview mode.
  const [previousPreview, setPreviousPreview] = useState(hasPreviewDay);
  if (previousPreview !== hasPreviewDay) {
    setPreviousPreview(hasPreviewDay);
    if (!hasPreviewDay) {
      setSelectedMeal(null);
    }
  }
  const visibleWater = hasPreviewDay ? water : 0;
  const meals = hasPreviewDay ? sampleMeals : [];
  const remainingCalories = Math.max(
    0,
    sampleDay.calorieGoal - sampleDay.calories,
  );
  const waterGlasses = useMemo(
    () => Math.min(10, Math.round(visibleWater / 250)),
    [visibleWater],
  );

  return (
    <Screen>
      <Header title="Fuel with intention." eyebrow="NUTRITION" />
      <FitnessPersonalization section="nutrition" />
      <Body style={{ marginBottom: 20 }}>
        Good food. Better energy. A healthier relationship with your plate.
      </Body>
      <Segmented
        options={["Yesterday", "Today", "Tomorrow"]}
        value={day}
        onChange={setDay}
      />

      <Card>
        <View style={n.row}>
          <Label>{day.toUpperCase()}’S BALANCE</Label>
          {hasPreviewDay ? (
            <Badge text="SAMPLE DAY" />
          ) : (
            <Badge text="NO RECORDS" color={p.muted} />
          )}
        </View>
        {hasPreviewDay ? (
          <>
            <View style={n.balance}>
              <ActivityRing
                size={width < 360 ? 116 : 142}
                value={sampleDay.calories}
                goal={sampleDay.calorieGoal}
                label=""
                unit="kcal"
                color={p.green}
              />
              <View style={{ flex: 1 }}>
                <Text style={n.value}>
                  {sampleDay.calories.toLocaleString()}{" "}
                  <Text style={n.unit}>kcal</Text>
                </Text>
                <Body style={{ fontSize: 11 }}>
                  of {sampleDay.calorieGoal.toLocaleString()} kcal goal
                </Body>
                <View style={{ height: 12 }} />
                <Text style={n.sub}>
                  Remaining{" "}
                  <Text style={{ color: p.text }}>
                    {remainingCalories} kcal
                  </Text>
                </Text>
                <Text style={n.sub}>
                  Logged across{" "}
                  <Text style={{ color: p.text }}>{meals.length} meals</Text>
                </Text>
              </View>
            </View>
            <View style={n.macros}>
              {[
                {
                  label: "Protein",
                  value: sampleDay.protein.value,
                  goal: sampleDay.protein.goal,
                  color: p.green,
                },
                {
                  label: "Carbs",
                  value: sampleDay.carbs.value,
                  goal: sampleDay.carbs.goal,
                  color: p.lavender,
                },
                {
                  label: "Fats",
                  value: sampleDay.fats.value,
                  goal: sampleDay.fats.goal,
                  color: p.orange,
                },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, gap: 8 }}>
                  <Text style={n.macroTitle}>{item.label}</Text>
                  <Text style={n.macroValue}>
                    {item.value} <Text style={n.unit}>/ {item.goal}g</Text>
                  </Text>
                  <Meter
                    value={item.value}
                    goal={item.goal}
                    color={item.color}
                    height={4}
                  />
                </View>
              ))}
            </View>
          </>
        ) : (
          <EmptyState
            icon="calendar"
            title={`No ${day.toLowerCase()} records yet.`}
            description="This empty state is ready for future meal logging. The design preview only includes a sample day for Today."
          />
        )}
      </Card>

      <Section
        title="Your daily plate"
        action={hasPreviewDay ? "Scan a meal" : undefined}
        onPress={() => router.push("/scanner")}
      />
      {hasPreviewDay && (
        <Body style={n.previewCopy}>
          Illustrative sample menu · tap a meal for its preview details.
        </Body>
      )}
      {hasPreviewDay ? (
        <View style={{ gap: 10 }}>
          {meals.map((meal) => (
            <Pressable
              key={meal.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${meal.title} sample details`}
              onPress={() => setSelectedMeal(meal)}
              style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
            >
              <Card style={n.meal}>
                <View style={n.mealIcon}>
                  <Icon
                    name={meal.icon as IconName}
                    color={p.orange}
                    size={19}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={n.mealTitle}>{meal.title}</Text>
                  <Text style={n.hint} numberOfLines={1}>
                    {meal.food}
                  </Text>
                  <Text style={n.time}>
                    {meal.time} · {meal.calories} kcal
                  </Text>
                </View>
                <Icon name="chevron-right" color={p.muted} size={17} />
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <Card>
          <EmptyState
            icon="clipboard"
            title="Your plate is ready when you are."
            description="Scan or add a meal once nutrition tracking is available. No records are stored from this design preview."
          />
          <Button
            title="Scan a meal"
            icon="camera"
            onPress={() => router.push("/scanner")}
          />
        </Card>
      )}

      <Section title="A moment to hydrate" />
      <Card>
        <View style={n.row}>
          <View style={n.inline}>
            <Icon name="droplet" color={p.blue} />
            <Text style={n.mealTitle}>Water intake</Text>
          </View>
          {hasPreviewDay ? (
            <Badge text="DEMO" color={p.blue} />
          ) : (
            <Badge text="EMPTY" color={p.muted} />
          )}
        </View>
        <View style={n.waterSummary}>
          <Text style={n.waterValue}>
            {hasPreviewDay ? visibleWater.toLocaleString() : "—"}
            <Text style={n.unit}> ml</Text>
          </Text>
          <Text style={n.sub}>
            {hasPreviewDay
              ? `of ${sampleDay.waterGoal.toLocaleString()} ml goal`
              : "Goal not set"}
          </Text>
        </View>
        <View style={n.water}>
          {Array.from({ length: 10 }, (_, index) => (
            <View
              key={index}
              style={[n.glass, index < waterGlasses && n.glassFilled]}
            >
              <Icon
                name="droplet"
                size={16}
                color={index < waterGlasses ? p.blue : p.muted}
              />
            </View>
          ))}
        </View>
        {hasPreviewDay ? (
          <View style={n.waterActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove 250 millilitres of demo water"
              onPress={() => setWater((value) => Math.max(0, value - 250))}
              style={n.stepper}
            >
              <Icon name="minus" color={p.text} size={17} />
            </Pressable>
            <Body style={{ flex: 1, textAlign: "center", fontSize: 11 }}>
              Demo only · 250 ml steps
            </Body>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add 250 millilitres of demo water"
              onPress={() =>
                setWater((value) => Math.min(sampleDay.waterGoal, value + 250))
              }
              style={n.stepper}
            >
              <Icon name="plus" color={p.text} size={17} />
            </Pressable>
          </View>
        ) : (
          <Body style={{ fontSize: 11 }}>
            Water logging will appear here once tracking is available.
          </Body>
        )}
      </Card>

      <Body style={n.footnote}>
        {hasPreviewDay
          ? "Sample day for interface preview only. No dietary advice or sample records are written."
          : "Your data will appear here once nutrition tracking is available."}
      </Body>

      <Modal
        visible={selectedMeal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMeal(null)}
      >
        <View style={n.modalBackdrop}>
          <View style={n.modalSheet} accessibilityViewIsModal>
            <View style={n.modalHeader}>
              <Badge text="SAMPLE MEAL" color={p.orange} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close meal details"
                onPress={() => setSelectedMeal(null)}
                style={n.close}
              >
                <Icon name="x" color={p.text} />
              </Pressable>
            </View>
            <View style={n.detailRow}>
              <FoodImage size={72} />
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={n.modalTitle}>{selectedMeal?.title}</Text>
                <Body style={{ fontSize: 11 }}>
                  {selectedMeal?.time} · {selectedMeal?.calories} kcal
                </Body>
              </View>
            </View>
            <Text style={n.foodName}>{selectedMeal?.food}</Text>
            <Body style={{ fontSize: 11, lineHeight: 17 }}>
              Illustrative meal detail for the design preview. It is not a
              recommendation or a logged food record.
            </Body>
            <Button
              title="Close details"
              icon="check"
              onPress={() => setSelectedMeal(null)}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const n = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 9,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: 9 },
  balance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginVertical: 20,
  },
  value: {
    color: p.text,
    fontSize: 27,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  unit: { color: p.muted, fontSize: 11, fontWeight: "400" },
  sub: { color: p.muted, fontSize: 11, marginVertical: 3 },
  macros: {
    flexDirection: "row",
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: p.border,
    paddingTop: 19,
  },
  macroTitle: { color: p.muted, fontSize: 11 },
  macroValue: { color: p.text, fontSize: 17, fontWeight: "600" },
  meal: { flexDirection: "row", alignItems: "center", gap: 13, padding: 15 },
  mealIcon: {
    height: 42,
    width: 42,
    backgroundColor: "#E9AA7610",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTitle: { color: p.text, fontSize: 13, fontWeight: "600" },
  hint: { color: p.muted, fontSize: 11, marginTop: 5 },
  time: { color: p.muted, fontSize: 10, marginTop: 5 },
  previewCopy: { fontSize: 11, marginTop: -3, marginBottom: 11 },
  waterSummary: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 18,
  },
  waterValue: { color: p.text, fontSize: 28, fontWeight: "600" },
  water: { flexDirection: "row", gap: 6, marginVertical: 18 },
  glass: {
    flex: 1,
    minHeight: 36,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: p.border,
    alignItems: "center",
    justifyContent: "center",
  },
  glassFilled: { backgroundColor: "#82B9DD12", borderColor: "#82B9DD55" },
  waterActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  stepper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: p.elevated,
    borderWidth: 1,
    borderColor: p.border,
    alignItems: "center",
    justifyContent: "center",
  },
  footnote: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 18,
    paddingHorizontal: 2,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#000000B3",
    padding: 22,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    borderRadius: 24,
    padding: 22,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    gap: 17,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  close: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  modalTitle: {
    color: p.text,
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  foodName: { color: p.text, fontSize: 15, fontWeight: "500" },
});
