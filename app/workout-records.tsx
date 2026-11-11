import { router } from "expo-router";
import { Text, View } from "react-native";
import {
  AuthGate,
  TrackingLoading,
  TrackingQueryError,
} from "@/components/bodyiq/tracking-form";
import {
  Body,
  Card,
  EmptyState,
  Button,
  Label,
  Section,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
import { trpc } from "@/lib/trpc";

export default function WorkoutRecordsScreen() {
  const query = trpc.workouts.personalRecords.useQuery(undefined, {
    retry: false,
  });
  const records = query.data ?? [];

  return (
    <AuthGate title="Personal records" badge="ESTIMATES">
      <Button
        title="Back to workouts"
        onPress={() => router.replace("/(tabs)/workouts")}
        secondary
        icon="arrow-left"
      />
      {query.isLoading ? (
        <TrackingLoading label="Loading your personal records…" />
      ) : query.isError ? (
        <TrackingQueryError onRetry={() => void query.refetch()} />
      ) : (
        <>
          <Section title="Your records" />
          {records.length ? (
            records.map((record) => (
              <Card key={record.exerciseId} style={{ marginBottom: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: p.text, fontSize: 15, fontWeight: "700" }}
                    >
                      {record.exerciseName}
                    </Text>
                    <Label color={p.green}>ESTIMATED RECORD</Label>
                  </View>
                  <Text
                    style={{ color: p.green, fontSize: 18, fontWeight: "800" }}
                  >
                    {record.estimatedOneRepMaxKg} kg
                  </Text>
                </View>
                <Body style={{ marginTop: 12 }}>
                  Estimated 1RM · best logged weight {record.bestWeightKg} kg ·{" "}
                  {record.reps} reps
                </Body>
              </Card>
            ))
          ) : (
            <Card>
              <EmptyState
                icon="award"
                title="No records to show yet"
                description="Personal records will be derived only from completed, logged sets. Nothing is inferred from planned, skipped or incomplete work."
              />
              <View style={{ marginTop: 12 }}>
                <Body style={{ textAlign: "center", fontSize: 11 }}>
                  Estimated records will be labeled clearly when completed set
                  data is available.
                </Body>
              </View>
            </Card>
          )}
        </>
      )}
    </AuthGate>
  );
}
