import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

type Metric = "Weight" | "Waist" | "Chest" | "Arm" | "Thigh";
export default function ProgressScreen() {
  const { isPreview } = useDesignPreview();
  const { isAuthenticated } = useAuth();
  return isPreview || !isAuthenticated ? <PreviewProgress /> : <RealProgress />;
}
function PreviewProgress() {
  const [period, setPeriod] =
    useState<keyof typeof sampleTrends.Weight>("Week");
  const [metric, setMetric] = useState<keyof typeof sampleTrends>("Weight");
  const trend = useMemo(() => sampleTrends[metric][period], [metric, period]);
  return (
    <Screen>
      <Header title="Small steps. Real change." eyebrow="PROGRESS" />
      <Button
        title="Record my progress"
        onPress={() => router.push("/log-progress")}
      />
      <Body style={{ marginVertical: 18 }}>
        A clearer picture of your journey — beyond just a number.
      </Body>
      <View style={s.stats}>
        <MiniStat
          icon="trending-down"
          value="78.4"
          unit="kg"
          title="Latest weight"
          color={p.blue}
        />
        <MiniStat
          icon="activity"
          value="4"
          unit="sessions"
          title="This week"
          color={p.green}
        />
      </View>
      <Section title="Your trend" />
      <Segmented
        options={["Weight", "Activity"]}
        value={metric}
        onChange={(v) => setMetric(v as any)}
      />
      <Card>
        <View style={s.chartHeader}>
          <Label>{metric.toUpperCase()} OVER TIME</Label>
          <Badge
            text="SAMPLE DATA"
            color={metric === "Weight" ? p.blue : p.green}
          />
        </View>
        <Segmented
          options={["Week", "Month", "Year"]}
          value={period}
          onChange={(v) => setPeriod(v as any)}
        />
        <SampleTrend
          values={trend.values}
          labels={trend.labels}
          min={trend.min}
          max={trend.max}
          color={metric === "Weight" ? p.blue : p.green}
          unit={metric === "Weight" ? "kg" : "sessions"}
        />
      </Card>
      <PreviewNoticeText />
    </Screen>
  );
}
function PreviewNoticeText() {
  return (
    <Body style={s.footnote}>
      All chart values and milestones are illustrative sample data only. They
      are not predictions.
    </Body>
  );
}
function RealProgress() {
  const [metric, setMetric] = useState<Metric>("Weight");
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");
  const q = trpc.progress.summary.useQuery({ period, limit: 100 });
  const del = trpc.progress.delete.useMutation({
    onSuccess: () => void q.refetch(),
  });
  const data = q.data;
  const series =
    data?.charts[metric.toLowerCase() as keyof typeof data.charts] ?? [];
  return (
    <Screen>
      <Header title="Your progress, recorded." eyebrow="PRIVATE PROGRESS" />
      <Button
        title="Record measurements"
        onPress={() => router.push("/log-progress")}
      />
      <Body style={{ marginVertical: 18 }}>
        Use your records to understand trends. BodyIQ does not promise a
        specific future transformation.
      </Body>
      {q.isLoading ? (
        <Card>
          <Body>Loading your private progress…</Body>
        </Card>
      ) : q.isError ? (
        <Card>
          <Body>We couldn’t load progress.</Body>
          <Button title="Retry" secondary onPress={() => q.refetch()} />
        </Card>
      ) : (
        <>
          <View style={s.stats}>
            <MiniStat
              icon="trending-down"
              value={data?.records.at(-1)?.weightKg?.toFixed(1) ?? "—"}
              unit="kg"
              title="Latest weight"
              color={p.blue}
            />
            <MiniStat
              icon="activity"
              value={String(data?.weekly.workouts ?? 0)}
              unit="sessions"
              title="This week"
              color={p.green}
            />
          </View>
          <Section title="Charts" />
          <Segmented
            options={["Weight", "Waist", "Chest", "Arm", "Thigh"]}
            value={metric}
            onChange={(v) => setMetric(v as Metric)}
          />
          <Card>
            <View style={s.chartHeader}>
              <Label>{metric.toUpperCase()} RECORDS</Label>
              <Badge
                text={series.length ? "RECORDED" : "NO DATA"}
                color={series.length ? p.green : p.muted}
              />
            </View>
            {series.length ? (
              <SimpleChart
                values={series.map((x) => x.value)}
                color={metric === "Weight" ? p.blue : p.green}
              />
            ) : (
              <EmptyChart
                metric={metric}
                units={metric === "Weight" ? "kg" : "cm"}
                period={period}
              />
            )}
            <Segmented
              options={["Week", "Month", "All"]}
              value={
                period === "week"
                  ? "Week"
                  : period === "month"
                    ? "Month"
                    : "All"
              }
              onChange={(v) =>
                setPeriod(
                  v === "Week" ? "week" : v === "Month" ? "month" : "all",
                )
              }
            />
          </Card>
          <Section title="Consistency & strength" />
          <View style={s.stats}>
            <MiniStat
              icon="activity"
              value={String(data?.monthly.workouts ?? 0)}
              unit="sessions"
              title="This month"
              color={p.green}
            />
            <MiniStat
              icon="bar-chart-2"
              value={
                data?.strength.bestWeightKg
                  ? `${data.strength.bestWeightKg.toFixed(1)}`
                  : "—"
              }
              unit="kg"
              title="Best logged set"
              color={p.blue}
            />
          </View>
          <Section title="Milestones" />
          {data?.milestones.length ? (
            <View style={{ gap: 10 }}>
              {data.milestones.map((m) => (
                <Card key={m} style={s.milestone}>
                  <Icon name="award" color={p.green} size={19} />
                  <Text style={s.milestoneText}>{m}</Text>
                </Card>
              ))}
            </View>
          ) : (
            <Card>
              <EmptyState
                icon="award"
                title="Your story starts with a record."
                description="Milestones appear only from your recorded measurements and completed workouts."
              />
            </Card>
          )}
          <Section title="Records" />
          {data?.records.length ? (
            <View style={{ gap: 10 }}>
              {data.records
                .slice()
                .reverse()
                .map((r) => (
                  <Card key={r.id} style={s.record}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.recordDate}>
                        {new Date(r.recordedAt).toLocaleDateString()}
                      </Text>
                      <Text style={s.recordValues}>
                        {r.weightKg ? `${r.weightKg.toFixed(1)} kg` : ""}
                        {r.waistCm
                          ? `  ·  Waist ${r.waistCm.toFixed(1)} cm`
                          : ""}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: "/log-progress",
                          params: { id: String(r.id) },
                        })
                      }
                    >
                      <Text style={s.action}>Edit</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => del.mutate({ id: r.id })}
                    >
                      <Text style={s.delete}>Delete</Text>
                    </Pressable>
                  </Card>
                ))}
            </View>
          ) : (
            <Card>
              <EmptyState
                icon="trending-up"
                title="No progress records yet"
                description="Record a measurement or optional photo to begin."
              />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
function SimpleChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  return (
    <View style={s.simpleChart}>
      {values.map((v, i) => (
        <View key={`${v}-${i}`} style={s.barWrap}>
          <View
            style={[
              s.bar,
              {
                height: Math.max(8, ((v - min) / (max - min || 1)) * 90 + 8),
                backgroundColor: color,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  stats: { flexDirection: "row", gap: 11 },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  footnote: { fontSize: 11, lineHeight: 17, marginTop: 18 },
  milestone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
  },
  milestoneText: { color: p.text, fontSize: 12, flex: 1 },
  record: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  recordDate: { color: p.muted, fontSize: 10 },
  recordValues: { color: p.text, fontSize: 12, marginTop: 5 },
  action: { color: p.green, fontSize: 11 },
  delete: { color: "#FF8D8D", fontSize: 11 },
  simpleChart: {
    height: 120,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    paddingVertical: 12,
  },
  barWrap: { flex: 1, height: 100, justifyContent: "flex-end" },
  bar: { borderRadius: 4, minHeight: 8 },
});
