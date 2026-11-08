import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { ActivityRing } from "@/components/bodyiq/charts";
import {
  Badge,
  Body,
  Card,
  Header,
  Icon,
  IconName,
  Label,
  PreviewNotice,
  Screen,
  Section,
  Segmented,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";

export default function NutritionScreen() {
  const [day, setDay] = useState("Today");
  return (
    <Screen>
      <Header title="Fuel with intention." eyebrow="NUTRITION" />
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
          <Badge text="PREVIEW" />
        </View>
        <View style={n.balance}>
          <ActivityRing size={142} />
          <View style={{ flex: 1 }}>
            <Text style={n.value}>
              — <Text style={n.unit}>kcal</Text>
            </Text>
            <Body style={{ fontSize: 11 }}>Calorie goal not set</Body>
            <View style={{ height: 15 }} />
            <Text style={n.sub}>
              Consumed <Text style={{ color: p.text }}>—</Text>
            </Text>
            <Text style={n.sub}>
              Remaining <Text style={{ color: p.text }}>—</Text>
            </Text>
          </View>
        </View>
        <View style={n.macros}>
          {[
            { label: "Protein", color: p.green },
            { label: "Carbs", color: p.lavender },
            { label: "Fats", color: p.orange },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1 }}>
              <Text style={n.macroTitle}>{item.label}</Text>
              <Text style={n.macroValue}>
                — <Text style={n.unit}>g</Text>
              </Text>
              <View style={n.track}>
                <View
                  style={{
                    width: 5,
                    height: 4,
                    backgroundColor: item.color,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </Card>
      <Section title="Your daily plate" />
      <View style={{ gap: 10 }}>
        {[
          {
            title: "Breakfast",
            icon: "sunrise",
            hint: "Start your morning well",
          },
          { title: "Lunch", icon: "sun", hint: "Refuel for the afternoon" },
          { title: "Dinner", icon: "moon", hint: "Wind down, nourish up" },
          { title: "Snacks", icon: "coffee", hint: "The little things count" },
        ].map((meal) => (
          <Card key={meal.title} style={n.meal}>
            <View style={n.mealIcon}>
              <Icon name={meal.icon as IconName} color={p.orange} size={19} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={n.mealTitle}>{meal.title}</Text>
              <Text style={n.hint}>{meal.hint}</Text>
            </View>
            <Badge text="SOON" color={p.muted} />
          </Card>
        ))}
      </View>
      <Section title="A moment to hydrate" />
      <Card>
        <View style={n.row}>
          <View style={n.row}>
            <Icon name="droplet" color={p.blue} />
            <Text style={n.mealTitle}>Water intake</Text>
          </View>
          <Text style={n.sub}>— ml</Text>
        </View>
        <View style={n.water}>
          {Array.from({ length: 8 }, (_, i) => (
            <View key={i} style={n.glass}>
              <Icon name="droplet" size={17} color="#526255" />
            </View>
          ))}
        </View>
        <Body style={{ fontSize: 11 }}>
          Water logging will arrive with nutrition tracking.
        </Body>
      </Card>
      <PreviewNotice>
        Phase 1 layout. Meal logging, calorie goals, macro calculations, and
        water tracking are not active yet. No dietary advice is being generated.
      </PreviewNotice>
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
  balance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    marginVertical: 20,
  },
  value: { color: p.text, fontSize: 30, fontWeight: "600" },
  unit: { color: p.muted, fontSize: 11, fontWeight: "400" },
  sub: { color: p.muted, fontSize: 11, marginVertical: 4 },
  macros: {
    flexDirection: "row",
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: p.border,
    paddingTop: 20,
  },
  macroTitle: { color: p.muted, fontSize: 11 },
  macroValue: { color: p.text, fontSize: 20, marginVertical: 10 },
  track: { height: 4, backgroundColor: p.border, borderRadius: 4 },
  meal: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  mealIcon: {
    height: 42,
    width: 42,
    backgroundColor: "#E9AA7610",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTitle: { color: p.text, fontSize: 13, fontWeight: "500" },
  hint: { color: p.muted, fontSize: 10, marginTop: 6 },
  water: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginVertical: 22,
  },
  glass: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: p.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
