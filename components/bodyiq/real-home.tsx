import { useCallback } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useTrackingSummary } from "@/lib/tracking-client";
import { ActivityRing } from "./charts";
import {
  Badge,
  Body,
  Button,
  Card,
  Header,
  Label,
  Screen,
  Section,
} from "./ui";
import { palette as p } from "@/constants/design";
function fmt(value: number | null | undefined) {
  return value == null
    ? "—"
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
        value,
      );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: 90 }}>
      <Label>{label}</Label>
      <Text
        style={{ color: p.text, fontSize: 24, fontWeight: "700", marginTop: 8 }}
      >
        {value}
      </Text>
    </View>
  );
}
export default function RealHomeScreen() {
  const auth = useAuth();
  const query = useTrackingSummary();
  useFocusEffect(
    useCallback(() => {
      void query.refetch();
    }, [query.refetch]),
  );
  const data = query.data;
  if (!data)
    return (
      <Screen preview={false}>
        <Header
          home
          title="Make today count."
          eyebrow={auth.user?.name ?? "Your BodyIQ dashboard"}
        />
        <Card>
          {query.isLoading ? (
            <>
              <ActivityIndicator color={p.green} />
              <Body>Reading your food, workouts and progress…</Body>
            </>
          ) : (
            <>
              <Body>
                Your dashboard could not be loaded. No sample values are
                substituted.
              </Body>
              <View style={{ height: 18 }} />
              <Button
                title="Retry dashboard"
                onPress={() => void query.refetch()}
              />
            </>
          )}
        </Card>
      </Screen>
    );
  const targets = data.targets;
  const workout = data.todayWorkout;
  const weight = (kg: number) =>
    data.units === "imperial" ? kg * 2.2046226218 : kg;
  const unit = data.units === "imperial" ? "lb" : "kg";
  const date = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: data.timeZone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  return (
    <Screen preview={false}>
      <Header
        home
        title="Make today count."
        eyebrow={
          auth.user?.name
            ? `${auth.user.name.split(" ")[0]} · ${data.dayLabel}`
            : data.dayLabel
        }
      />
      <Badge text="YOUR ACTUAL LOGS · BODYIQ CLOUD" />
      {query.isError && (
        <Body style={{ color: p.green, marginTop: 12 }}>
          Showing the last successful update. Refresh failed; retry to check
          your latest records.
        </Body>
      )}
      <Card style={{ marginTop: 20 }}>
        <Section
          title="Today's nutrition"
          action="Log a meal"
          onPress={() => router.push("/log-meal")}
        />
        <View style={{ alignItems: "center", marginVertical: 18 }}>
          <ActivityRing
            value={data.consumed.calories}
            label="Calories consumed"
            unit="kcal"
            dataKind="real"
            goal={targets?.calories ?? 0}
            size={184}
            color={p.green}
          />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
          <Stat label="Daily kcal target" value={fmt(targets?.calories)} />
          <Stat label="Consumed kcal" value={fmt(data.consumed.calories)} />
          <Stat label="Remaining kcal" value={fmt(data.remainingCalories)} />
        </View>
        {data.overTargetCalories != null && data.overTargetCalories > 0 && (
          <Body style={{ marginTop: 12 }}>
            {fmt(data.overTargetCalories)} kcal above your estimated target.
            This is information, not a judgment.
          </Body>
        )}
        <View style={{ height: 18 }} />
        {[
          {
            name: "Protein",
            consumed: data.consumed.proteinG,
            target: targets?.proteinG,
          },
          {
            name: "Carbohydrates",
            consumed: data.consumed.carbsG,
            target: targets?.carbsG,
          },
          { name: "Fat", consumed: data.consumed.fatG, target: targets?.fatG },
        ].map((macro) => (
          <View
            key={macro.name}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 10,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: p.border,
            }}
          >
            <Text style={{ color: p.text, fontWeight: "600" }}>
              {macro.name}
            </Text>
            <Text style={{ color: p.green }}>
              {fmt(macro.consumed)} / {fmt(macro.target)} g
            </Text>
          </View>
        ))}
        <Body style={{ fontSize: 11, marginTop: 12, lineHeight: 18 }}>
          Consumption is summed from your logged meals. Targets are onboarding
          estimates; exercise does not automatically add calories.
        </Body>
        {targets?.calories ? (
          <Body style={{ fontSize: 11, marginTop: 10 }}>{targets.note}</Body>
        ) : (
          <>
            <View style={{ height: 14 }} />
            <Button
              title="Set or review my estimated targets"
              secondary
              onPress={() => router.push("/fitness-profile")}
            />
          </>
        )}
      </Card>
      <Section title="Quick actions" />
      <View style={{ gap: 10 }}>
        <Button
          title="Log a meal"
          icon="plus"
          onPress={() => router.push("/log-meal")}
        />
        <Button
          title="Scan food"
          icon="camera"
          secondary
          onPress={() => router.push("/scanner")}
        />
        <Body style={{ fontSize: 11 }}>
          Scan a photo, review the estimates, correct anything needed, then
          confirm it into today’s diary.
        </Body>
        <Button
          title={
            workout && !workout.completedAt
              ? "Continue workout"
              : "Start workout"
          }
          icon="activity"
          secondary
          onPress={() => router.push("/workout-session")}
        />
      </View>
      <Section title="Today's workout" />
      <Card>
        <Badge
          text={
            workout
              ? workout.completedAt
                ? "COMPLETED TODAY"
                : "IN PROGRESS"
              : "YOUR SAVED TRAINING PLAN"
          }
        />
        <Text
          style={{
            color: p.text,
            fontSize: 22,
            fontWeight: "700",
            marginVertical: 14,
          }}
        >
          {workout?.name ??
            data.plannedWorkout?.title ??
            "Set your training baseline"}
        </Text>
        <Body>
          {workout
            ? workout.completedAt
              ? `Completed ${date(workout.completedAt)}`
              : `Started ${date(workout.startedAt)}`
            : data.plannedWorkout
              ? "A suggested session from your saved goals and equipment—not a completed workout."
              : "Complete your fitness profile to create a starter workout."}
        </Body>
        <View style={{ height: 16 }} />
        <Button
          title={
            data.plannedWorkout || workout
              ? "Open workout session"
              : "Complete fitness onboarding"
          }
          onPress={() =>
            router.push(
              data.plannedWorkout || workout
                ? "/workout-session"
                : "/onboarding",
            )
          }
          secondary
        />
      </Card>
      <Card style={{ marginTop: 16 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
          <Stat
            label="Training days this week"
            value={`${fmt(data.weekly.completedDays)} / ${fmt(data.weekly.targetDays)}`}
          />
          <Stat
            label="Completed sessions"
            value={fmt(data.weekly.completedSessions)}
          />
        </View>
        <Body style={{ fontSize: 11, marginTop: 14 }}>
          Monday–Sunday in {data.timeZone}. Multiple completed sessions on one
          day count as one training day.
        </Body>
      </Card>
      <Section
        title="Your weight"
        action="Update"
        onPress={() => router.push("/log-weight")}
      />
      <Card>
        <Label>CURRENT SAVED WEIGHT</Label>
        <Text
          style={{
            color: p.green,
            fontWeight: "700",
            fontSize: 36,
            marginTop: 12,
          }}
        >
          {data.currentWeightKg == null
            ? "—"
            : fmt(weight(data.currentWeightKg))}{" "}
          <Text style={{ fontSize: 15 }}>{unit}</Text>
        </Text>
        <Body style={{ fontSize: 11, marginTop: 8 }}>
          From your saved fitness profile or latest weight log. No weight is
          inferred from sample data.
        </Body>
        <View style={{ height: 16 }} />
        <Button
          title="Record my weight"
          secondary
          onPress={() => router.push("/log-weight")}
        />
      </Card>
      <Section title="Recent progress" />
      <Card>
        {data.recentProgress.length ? (
          data.recentProgress.map((event) => (
            <View
              key={event.id}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: p.border,
              }}
            >
              <Text style={{ color: p.text, fontWeight: "600" }}>
                {event.label}
                {event.type === "weight" && event.weightKg != null
                  ? ` · ${fmt(weight(event.weightKg))} ${unit}`
                  : ""}
              </Text>
              <Body style={{ fontSize: 11, marginTop: 5 }}>
                {date(event.recordedAt)}
              </Body>
            </View>
          ))
        ) : (
          <Body>
            Your recent weight logs and completed workouts will appear here. No
            progress has been fabricated.
          </Body>
        )}
      </Card>
      <Section
        title="Meals logged today"
        action="Add meal"
        onPress={() => router.push("/log-meal")}
      />
      <Card>
        {data.meals.length ? (
          data.meals.map((meal) => (
            <View
              key={meal.id}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: p.border,
              }}
            >
              <Text style={{ color: p.text, fontWeight: "600" }}>
                {meal.name} · {fmt(meal.calories)} kcal
              </Text>
              <Body style={{ fontSize: 11, marginTop: 5 }}>
                {meal.mealType} · P {fmt(meal.proteinG)} / C {fmt(meal.carbsG)}{" "}
                / F {fmt(meal.fatG)} g
              </Body>
            </View>
          ))
        ) : (
          <Body>
            No meals logged today. Zero consumed calories means no saved
            entries, not a confirmed fast.
          </Body>
        )}
      </Card>
      <View style={{ height: 20 }} />
      <Button
        title={query.isFetching ? "Updating dashboard…" : "Refresh dashboard"}
        secondary
        disabled={query.isFetching}
        onPress={() => void query.refetch()}
      />
      <Body style={{ fontSize: 10, marginTop: 12 }}>
        Updates after saves, on return and app foreground, with a 30-second
        refresh while active.
      </Body>
    </Screen>
  );
}
