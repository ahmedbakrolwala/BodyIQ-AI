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
  Icon,
  Section,
} from "@/components/bodyiq/ui";
import { palette as p } from "@/constants/design";
import { trpc } from "@/lib/trpc";

function date(value: Date | string | null) {
  if (!value) return "Completion date unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function WorkoutHistoryScreen() {
  const query = trpc.workouts.history.useQuery({ limit: 20 }, { retry: false });
  const sessions = query.data ?? [];

  return (
    <AuthGate title="Workout history" badge="PRIVATE">
      <Button
        title="Back to workouts"
        onPress={() => router.replace("/(tabs)/workouts")}
        secondary
        icon="arrow-left"
      />
      {query.isLoading ? (
        <TrackingLoading label="Loading your workout history…" />
      ) : query.isError ? (
        <TrackingQueryError onRetry={() => void query.refetch()} />
      ) : (
        <>
          <Section title="Completed sessions" />
          {sessions.length ? (
            sessions.map((session) => (
              <Card
                key={session.id}
                style={{
                  marginBottom: 10,
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <Icon name="check-circle" color={p.green} size={22} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: p.text, fontSize: 14, fontWeight: "700" }}
                  >
                    Completed workout session #{session.id}
                  </Text>
                  <Body style={{ marginTop: 4 }}>
                    {date(session.completedAt)}
                  </Body>
                </View>
              </Card>
            ))
          ) : (
            <Card>
              <EmptyState
                icon="clock"
                title="No completed workouts yet"
                description="Finish a session explicitly and it will appear here. We never fill history with sample or inferred activity."
              />
            </Card>
          )}
        </>
      )}
    </AuthGate>
  );
}
