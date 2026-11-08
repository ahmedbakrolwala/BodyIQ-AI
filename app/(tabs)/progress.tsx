import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { EmptyChart } from "@/components/bodyiq/charts";
import {
  Badge,
  Body,
  Card,
  EmptyState,
  Header,
  Icon,
  Label,
  PreviewNotice,
  Screen,
  Section,
  Segmented,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";

export default function ProgressScreen() {
  const [period, setPeriod] = useState("Week");
  const [metric, setMetric] = useState("Weight");
  return (
    <Screen>
      <Header title="Small steps. Real change." eyebrow="PROGRESS" />
      <Body style={{ marginBottom: 24 }}>
        A clearer picture of your journey — beyond just a number.
      </Body>
      <View style={r.stats}>
        {[
          {
            title: "CURRENT WEIGHT",
            unit: "kg",
            icon: "trending-up",
            color: p.blue,
          },
          {
            title: "SESSIONS",
            unit: "completed",
            icon: "activity",
            color: p.green,
          },
        ].map((item) => (
          <Card key={item.title} style={{ flex: 1, padding: 17 }}>
            <Icon name={item.icon as "activity"} color={item.color} size={20} />
            <Label>{item.title}</Label>
            <Text style={r.value}>—</Text>
            <Body style={{ fontSize: 10 }}>{item.unit}</Body>
          </Card>
        ))}
      </View>
      <Section title="Your trend" />
      <Segmented
        options={["Weight", "Activity"]}
        value={metric}
        onChange={setMetric}
      />
      <Card>
        <View style={r.chartHeader}>
          <Label>{metric.toUpperCase()} OVER TIME</Label>
          <Badge text="NO DATA YET" color={p.muted} />
        </View>
        <View style={{ marginTop: 18 }}>
          <Segmented
            options={["Week", "Month", "Year"]}
            value={period}
            onChange={setPeriod}
          />
        </View>
        <EmptyChart
          metric={metric}
          units={metric === "Weight" ? "kg" : "sessions"}
          period={period}
        />
      </Card>
      <Section title="Beyond the numbers" />
      <Card style={r.insight}>
        <View style={r.icon}>
          <Icon name="trending-up" color={p.green} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={r.insightTitle}>Consistency is a kind of progress.</Text>
          <Body style={{ fontSize: 11, marginTop: 7 }}>
            Your future insights will connect the dots between your everyday
            habits and your longer-term goals.
          </Body>
        </View>
      </Card>
      <Section title="Your milestones" />
      <Card>
        <EmptyState
          icon="award"
          title="The story is yours to write."
          description="Your achievements will appear here as tracking becomes available. There are no recorded measurements yet."
        />
      </Card>
      <PreviewNotice>
        Chart axes and filters are layout placeholders. The dashed baseline is
        not a measurement, trend, or prediction. Measurement logging and
        insights are not active in Phase 1.
      </PreviewNotice>
    </Screen>
  );
}
const r = StyleSheet.create({
  stats: { flexDirection: "row", gap: 12 },
  value: { color: p.text, fontSize: 32, fontWeight: "600", marginTop: 14 },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  insight: {
    flexDirection: "row",
    gap: 14,
    padding: 18,
    backgroundColor: "#182014",
    borderColor: "#C3FF5C20",
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C3FF5C10",
  },
  insightTitle: { color: p.text, fontSize: 13, fontWeight: "600" },
});
