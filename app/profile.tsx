import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Body,
  Button,
  Card,
  Choice,
  Icon,
  Label,
  Screen,
  Section,
} from "@/components/bodyiq/ui";
import { palette as p, goalLabels } from "@/constants/design";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

type Goal = keyof typeof goalLabels;
export default function ProfileScreen() {
  const auth = useAuth();
  const profile = trpc.profile.get.useQuery(undefined, {
    enabled: auth.isAuthenticated,
    retry: false,
  });
  const utils = trpc.useUtils();
  const save = trpc.profile.save.useMutation({
    onSuccess: async () => {
      await utils.profile.get.invalidate();
      setMessage("Your profile is saved securely to BodyIQ Cloud.");
      setError("");
    },
  });
  const [draftName, setName] = useState<string | null>(null);
  const [draftGoal, setGoal] = useState<Goal | null>(null);
  const [draftCountry, setCountry] = useState<string | null>(null);
  const [draftUnits, setUnits] = useState<"metric" | "imperial" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const name =
    draftName ??
    profile.data?.displayName ??
    auth.user?.name?.slice(0, 60) ??
    "";
  const goal = draftGoal ?? profile.data?.goal ?? "get_fitter";
  const country = draftCountry ?? profile.data?.country ?? "IN";
  const units = draftUnits ?? profile.data?.units ?? "metric";
  async function submit() {
    setMessage("");
    setError("");
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[A-Z]{2}$/.test(country.trim().toUpperCase())) {
      setError("Use a two-letter country code, such as IN, US, or GB.");
      return;
    }
    try {
      await save.mutateAsync({
        displayName: name.trim(),
        goal,
        country: country.trim().toUpperCase(),
        units,
      });
    } catch {
      setError(
        "Your profile could not be saved. Check your connection and try again.",
      );
    }
  }
  async function logout() {
    await auth.logout();
    utils.profile.get.reset();
    router.replace("/welcome");
  }
  return (
    <Screen preview={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={f.header}>
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
            style={f.back}
          >
            <Icon name="arrow-left" color={p.text} />
          </Pressable>
          <Text style={f.title}>Your profile</Text>
          <Badge text="CLOUD SYNC" />
        </View>
        <Body>Your goals are personal. Your fitness space should be, too.</Body>
        <View style={{ marginTop: 22 }}>
          <Button
            title="Settings & preferences"
            secondary
            onPress={() => router.push("/settings")}
            icon="sliders"
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 15,
            marginTop: 22,
            padding: 20,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: p.border,
            backgroundColor: p.surface,
          }}
        >
          <View
            style={{
              width: 55,
              height: 55,
              borderRadius: 18,
              backgroundColor: p.greenDark,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Icon name="user" color={p.green} size={26} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: p.text, fontSize: 18, fontWeight: "600" }}>
              {auth.user?.name ?? "Your personal space"}
            </Text>
            <Body style={{ fontSize: 10, marginTop: 6 }}>
              {auth.isAuthenticated
                ? "Real account · Secure cloud profile"
                : "Guest explorer · Sign in to save your profile"}
            </Body>
          </View>
        </View>
        {auth.loading ? (
          <View style={{ padding: 50 }}>
            <ActivityIndicator color={p.green} />
            <Body style={{ textAlign: "center", marginTop: 16 }}>
              Checking your secure session…
            </Body>
          </View>
        ) : auth.error ? (
          <Card style={{ marginTop: 24 }}>
            <Body color={p.error}>
              We couldn’t check your sign-in because of a connection problem.
              Your stored credentials have not been removed.
            </Body>
            <View style={{ height: 16 }} />
            <Button
              title="Retry secure connection"
              onPress={() => {
                void auth.refresh();
              }}
              icon="refresh-cw"
            />
          </Card>
        ) : !auth.isAuthenticated ? (
          <Card style={{ marginTop: 24 }}>
            <View style={f.lock}>
              <Icon name="lock" size={28} color={p.green} />
            </View>
            <Text style={f.signTitle}>Make it yours.</Text>
            <Body style={{ marginBottom: 24 }}>
              Sign in securely with your Manus account to save your name, goal,
              country, and units. Guest exploration does not save personal data
              to the cloud.
            </Body>
            <Button
              title="Sign in securely"
              onPress={() => router.push("/login")}
              icon="lock"
            />
            <View style={{ height: 12 }} />
            <Button
              title="Continue exploring"
              secondary
              onPress={() => router.replace("/(tabs)")}
              icon="compass"
            />
            <View style={{ height: 12 }} />
            <Button
              title="Create a BodyIQ account"
              secondary
              onPress={() => router.push("/register")}
              icon="user-plus"
            />
          </Card>
        ) : (
          <>
            <View style={f.signed}>
              <Icon name="shield" size={15} color={p.green} />
              <Body style={{ fontSize: 11, flex: 1 }}>
                Signed in as{" "}
                {auth.user?.email ?? auth.user?.name ?? "BodyIQ member"}
              </Body>
            </View>
            {profile.isLoading ? (
              <ActivityIndicator color={p.green} style={{ margin: 30 }} />
            ) : profile.isError ? (
              <Card>
                <Body color={p.error}>
                  We couldn’t load your saved profile. Your data has not been
                  changed.
                </Body>
                <View style={{ height: 15 }} />
                <Button
                  title="Retry loading profile"
                  onPress={() => {
                    profile.refetch();
                  }}
                  secondary
                  icon="refresh-cw"
                />
              </Card>
            ) : (
              <>
                <Section title="The basics" />
                <Card>
                  <Label>YOUR NAME</Label>
                  <TextInput
                    accessibilityLabel="Your name"
                    placeholder="What should we call you?"
                    placeholderTextColor={p.muted}
                    value={name}
                    onChangeText={setName}
                    maxLength={60}
                    style={f.input}
                    autoComplete="name"
                  />
                  <View style={{ height: 18 }} />
                  <Label>COUNTRY CODE</Label>
                  <TextInput
                    accessibilityLabel="Two-letter country code"
                    placeholder="IN"
                    placeholderTextColor={p.muted}
                    value={country}
                    onChangeText={(v) => setCountry(v.toUpperCase())}
                    maxLength={2}
                    autoCapitalize="characters"
                    style={f.input}
                  />
                  <Body style={{ fontSize: 10, marginTop: 8 }}>
                    India by default. Use an ISO country code (IN, US, GB).
                  </Body>
                </Card>
                <Section title="What brings you here?" />
                <View style={{ gap: 10 }}>
                  {(Object.keys(goalLabels) as Goal[]).map((key) => (
                    <Choice
                      key={key}
                      label={goalLabels[key]}
                      selected={goal === key}
                      onPress={() => setGoal(key)}
                    />
                  ))}
                </View>
                <Section title="Your preferred units" />
                <View style={{ gap: 10 }}>
                  <Choice
                    label="Metric · kilograms, centimetres"
                    selected={units === "metric"}
                    onPress={() => setUnits("metric")}
                  />
                  <Choice
                    label="Imperial · pounds, inches"
                    selected={units === "imperial"}
                    onPress={() => setUnits("imperial")}
                  />
                </View>
                <View style={{ marginTop: 28 }}>
                  <Button
                    title={
                      save.isPending
                        ? "Saving to BodyIQ Cloud…"
                        : "Save profile"
                    }
                    disabled={save.isPending}
                    onPress={submit}
                    icon="check"
                  />
                </View>
              </>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={logout}
              style={f.logout}
            >
              <Text style={{ color: p.muted, fontSize: 12 }}>
                Sign out of BodyIQ AI
              </Text>
            </Pressable>
          </>
        )}
        {error ? (
          <Text accessibilityRole="alert" style={f.error}>
            {error}
          </Text>
        ) : null}
        {message ? (
          <Text accessibilityRole="alert" style={f.success}>
            {message}
          </Text>
        ) : null}
        <View style={f.privacy}>
          <Icon name="shield" size={14} />
          <Body style={{ fontSize: 10, flex: 1 }}>
            Only your basic profile is stored in Phase 1. No health
            measurements, meal logs, or AI conversations are collected yet.
          </Body>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
const f = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  back: {
    height: 44,
    width: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: p.border,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: p.text,
    fontWeight: "600",
    fontSize: 20,
    flex: 1,
    letterSpacing: -0.5,
  },
  lock: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: p.greenDark,
    marginBottom: 22,
  },
  signTitle: {
    color: p.text,
    fontSize: 26,
    fontWeight: "600",
    marginBottom: 12,
  },
  signed: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: p.background,
    borderWidth: 1,
    borderColor: p.border,
    color: p.text,
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 15,
    fontSize: 14,
    marginTop: 12,
  },
  logout: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  privacy: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginTop: 22,
  },
  error: { color: p.error, fontSize: 12, lineHeight: 20, marginTop: 16 },
  success: { color: p.green, fontSize: 12, lineHeight: 20, marginTop: 16 },
});
