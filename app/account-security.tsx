import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import {
  AuthFrame,
  AuthFeedback,
  SecurityNote,
} from "@/components/bodyiq/auth-form";
import { Body, Button, Card, Section } from "@/components/bodyiq/ui";
import { SettingRow } from "@/components/bodyiq/premium";
import { useAuth } from "@/hooks/use-auth";
import { palette as p } from "@/constants/design";
export default function AccountSecurityScreen() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await auth.logout();
      router.replace("/welcome");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Sign-out could not be completed. Check your connection and retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="Account security"
      heading={"Private.\nProtected. Yours."}
      description="Manage access to your BodyIQ account without changing your fitness preferences."
    >
      {auth.loading ? (
        <Card>
          <ActivityIndicator color={p.green} />
          <Body style={{ textAlign: "center", marginTop: 15 }}>
            Checking your secure session…
          </Body>
        </Card>
      ) : auth.error ? (
        <Card>
          <AuthFeedback error="Your account connection could not be verified." />
          <Button
            title="Retry secure connection"
            onPress={() => void auth.refresh()}
            secondary
          />
        </Card>
      ) : !auth.isAuthenticated ? (
        <Card>
          <Body style={{ marginBottom: 20 }}>
            Sign in to manage a real account. Guest exploration never creates a
            cloud profile.
          </Body>
          <Button
            title="Sign in securely"
            onPress={() => router.push("/login")}
          />
        </Card>
      ) : (
        <>
          <Card>
            <Body color={p.text}>
              {auth.user?.email ?? auth.user?.name ?? "BodyIQ member"}
            </Body>
            <Body style={{ fontSize: 12, marginTop: 12 }}>
              Account access:{" "}
              {auth.user?.authProvider === "email"
                ? "Email and password"
                : auth.user?.authProvider === "google"
                  ? "Google"
                  : "Manus"}
            </Body>
            <Body style={{ fontSize: 12, marginTop: 7 }}>
              {auth.user?.emailVerified
                ? "Email address verified"
                : "Account provider connected"}
            </Body>
            <SecurityNote>
              New BodyIQ sessions persist for up to 30 days. Signing out revokes
              the current session; password resets revoke all sessions.
            </SecurityNote>
          </Card>
          <Section title="Recovery & access" />
          <Card style={{ paddingVertical: 3 }}>
            <SettingRow
              title="Password recovery"
              subtitle="Request a reset link for an email/password account"
              icon="key"
              onPress={() => router.push("/forgot-password")}
            />
            <SettingRow
              title="Personal profile"
              subtitle="Your private cloud-saved preferences"
              icon="user"
              onPress={() => router.push("/profile")}
            />
          </Card>
          <View style={{ height: 22 }} />
          <AuthFeedback error={error} busy={busy} />
          <Button
            title={busy ? "Signing out securely…" : "Sign out of BodyIQ AI"}
            secondary
            icon="log-out"
            disabled={busy}
            onPress={logout}
          />
          <Section title="Account control" />
          <Card style={{ paddingVertical: 3 }}>
            <SettingRow
              title="Delete account"
              subtitle="Permanently remove your BodyIQ account and data"
              icon="trash-2"
              onPress={() => router.push("/delete-account")}
            />
          </Card>
        </>
      )}
    </AuthFrame>
  );
}
