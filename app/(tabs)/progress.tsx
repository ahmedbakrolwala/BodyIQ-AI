import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { EmptyChart, SampleTrend } from "@/components/bodyiq/charts";
import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  Header,
  Icon,
  Label,
  Screen,
  Section,
  Segmented,
} from "@/components/bodyiq/ui";
import { MiniStat } from "@/components/bodyiq/premium";
import { palette as p } from "@/constants/design";
import { sampleTrends } from "@/lib/sample-data";
import { useDesignPreview } from "@/lib/preview-context";

type Metric = keyof typeof sampleTrends;
type Period = keyof typeof sampleTrends.Weight;

export default function ProgressScreen() {
  const { isPreview } = useDesignPreview();
  const [period, setPeriod] = useState<Period>("Week");
  const [metric, setMetric] = useState<Metric>("Weight");
  const trend = useMemo(() => sampleTrends[metric][period], [metric, period]);
  const activitySessions = trend.values.reduce((sum, value) => sum + value, 0);
  const trendUnit = metric === "Weight" ? "kg" : "sessions";
  const trendColor = metric === "Weight" ? p.blue : p.green;

  return (
    <Screen>
      <Header title="Small steps. Real change." eyebrow="PROGRESS" />
      <View style={{ marginVertical: 16 }}>
        <Button
          title="Record my weight"
          onPress={() => router.push("/log-weight")}
        />
      </View>
      <Body style={{ marginBottom: 22 }}>
        A clearer picture of your journey — beyond just a number.
      </Body>

      <View style={r.stats}>
        <View style={{ flex: 1 }}>
          <MiniStat
            icon="trending-down"
            value={isPreview ? "78.4" : "—"}
            unit="kg"
            title="Latest weight"
            color={p.blue}
          />
          {!isPreview && <Body style={r.statHint}>No measurements yet</Body>}
        </View>
        <View style={{ flex: 1 }}>
          <MiniStat
            icon="activity"
            value={isPreview ? "4" : "—"}
            unit="sessions"
            title="This week"
            color={p.green}
          />
          {!isPreview && <Body style={r.statHint}>No sessions yet</Body>}
        </View>
      </View>

      <Section title="Your trend" />
      <Segmented
        options={["Weight", "Activity"]}
        value={metric}
        onChange={(value) => setMetric(value as Metric)}
      />
      <Card>
        <View style={r.chartHeader}>
          <View>
            <Label>{metric.toUpperCase()} OVER TIME</Label>
            {isPreview && (
              <Text style={r.chartValue}>
                {metric === "Weight" ? "78.4" : activitySessions}{" "}
                <Text style={r.chartUnit}>{trendUnit}</Text>
              </Text>
            )}
          </View>
          {isPreview ? (
            <Badge text="SAMPLE DATA" color={trendColor} />
          ) : (
            <Badge text="NO DATA YET" color={p.muted} />
          )}
        </View>
        <View style={{ marginTop: 17 }}>
          <Segmented
            options={["Week", "Month", "Year"]}
            value={period}
            onChange={(value) => setPeriod(value as Period)}
          />
        </View>
        {isPreview ? (
          <SampleTrend
            values={trend.values}
            labels={trend.labels}
            min={trend.min}
            max={trend.max}
            color={trendColor}
            unit={trendUnit}
          />
        ) : (
          <EmptyChart metric={metric} units={trendUnit} period={period} />
        )}
      </Card>

      <Section title="Beyond the numbers" />
      {isPreview ? (
        <Card style={r.insight}>
          <View style={r.insightIcon}>
            <Icon name="trending-up" color={p.green} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={r.insightHeader}>
              <Text style={r.insightTitle}>A steady week</Text>
              <Badge text="SAMPLE" color={p.green} />
            </View>
            <Body style={{ fontSize: 11, marginTop: 7 }}>
              The sample trend shows a gentle 0.5 kg shift across the week — a
              visual example, not a real measurement or prediction.
            </Body>
          </View>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon="trending-up"
            title="Your story starts with a record."
            description="Future insights will connect your measurements and sessions once tracking is available."
          />
        </Card>
      )}

      <Section title="Your milestones" />
      {isPreview ? (
        <View style={{ gap: 10 }}>
          <Card style={r.milestone}>
            <View style={[r.milestoneIcon, { backgroundColor: "#C3FF5C14" }]}>
              <Icon name="award" color={p.green} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={r.milestoneTitle}>Four sessions in a week</Text>
              <Text style={r.milestoneSub}>Sample consistency milestone</Text>
            </View>
            <Badge text="SAMPLE" color={p.green} />
          </Card>
          <Card style={r.milestone}>
            <View style={[r.milestoneIcon, { backgroundColor: "#82B9DD14" }]}>
              <Icon name="bar-chart-2" color={p.blue} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={r.milestoneTitle}>Compared with last period</Text>
              <Text style={r.milestoneSub}>
                −0.5 kg · illustrative comparison
              </Text>
            </View>
            <Icon name="arrow-down-right" color={p.blue} size={18} />
          </Card>
        </View>
      ) : (
        <Card>
          <EmptyState
            icon="award"
            title="The story is yours to write."
            description="Your achievements will appear here as tracking becomes available. There are no recorded measurements yet."
          />
        </Card>
      )}

      <Body style={r.footnote}>
        {isPreview
          ? "All chart values, milestones, and comparisons are illustrative sample data for the interface preview only."
          : "Your data will appear here once progress tracking is available."}
      </Body>
    </Screen>
  );
}

const r = StyleSheet.create({
  stats: { flexDirection: "row", gap: 11 },
  statCard: { flex: 1, padding: 15 },
  statHint: { fontSize: 10, marginTop: 9 },
  chartHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 9,
  },
  chartValue: {
    color: p.text,
    fontSize: 28,
    fontWeight: "600",
    marginTop: 10,
    letterSpacing: -0.6,
  },
  chartUnit: { color: p.muted, fontSize: 11, fontWeight: "400" },
  insight: {
    flexDirection: "row",
    gap: 14,
    padding: 18,
    backgroundColor: "#182014",
    borderColor: "#C3FF5C20",
  },
  insightIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C3FF5C10",
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  insightTitle: { color: p.text, fontSize: 13, fontWeight: "600", flex: 1 },
  milestone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneTitle: { color: p.text, fontSize: 13, fontWeight: "600" },
  milestoneSub: { color: p.muted, fontSize: 10, marginTop: 5 },
  footnote: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 18,
    paddingHorizontal: 2,
  },
});
