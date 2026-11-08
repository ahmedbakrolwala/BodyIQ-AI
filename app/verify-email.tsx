import { useState } from "react";
import { View, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  AuthFrame,
  AuthField,
  AuthFeedback,
  AuthInfo,
  SecurityNote,
} from "@/components/bodyiq/auth-form";
import { Body, Button, Card, Icon } from "@/components/bodyiq/ui";
import {
  getAuthCapabilities,
  verifyEmail,
  resendVerification,
} from "@/lib/account-auth";
import { validateEmail } from "@/lib/auth-validation";
import { palette as p } from "@/constants/design";
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = first(params.token) ?? "";
  const [email, setEmail] = useState(first(params.email) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const cap = useQuery({
    queryKey: ["auth", "capabilities"],
    queryFn: getAuthCapabilities,
    retry: false,
  });
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const result = await verifyEmail(token);
      setMessage(result.message);
      setVerified(true);
      router.setParams({ token: undefined });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your email could not be verified.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    const issue = validateEmail(email);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setMessage((await resendVerification(email)).message);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We could not request another verification email.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="Verify email"
      heading={verified ? "You’re verified." : "Check your\ninbox."}
      description={
        verified
          ? "Your email is confirmed. You can now sign in securely."
          : "Open the verification email and confirm your address before signing in."
      }
    >
      <Card>
        <View style={{ alignItems: "center", paddingVertical: 14, gap: 14 }}>
          <Icon
            name={verified ? "check-circle" : "mail"}
            size={36}
            color={p.green}
          />
          <Text
            style={{
              color: p.text,
              fontSize: 18,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {verified
              ? "Email verification complete"
              : "One small step. A safer account."}
          </Text>
          <Body style={{ textAlign: "center", fontSize: 12 }}>
            Verification links are single-use and expire after 24 hours. Check
            spam if the message hasn’t arrived.
          </Body>
        </View>
        <AuthFeedback busy={busy} error={error} message={message} />
        {Boolean(token) && !verified && (
          <Button
            title={busy ? "Verifying…" : "Verify my email"}
            onPress={confirm}
            disabled={busy}
            icon="check"
          />
        )}
        {verified ? (
          <Button
            title="Continue to sign in"
            onPress={() => router.replace("/login")}
          />
        ) : (
          <>
            <View style={{ height: 20 }} />
            <AuthField
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              maxLength={320}
              placeholder="you@example.com"
              editable={!busy}
            />
            {cap.data && !cap.data.emailDelivery && (
              <AuthInfo>
                Email delivery is not configured yet. No verification email will
                be simulated.
              </AuthInfo>
            )}
            {cap.isError && (
              <AuthFeedback error="The email service could not be checked. Try again shortly." />
            )}
            <Button
              title={busy ? "Requesting email…" : "Resend verification email"}
              onPress={resend}
              disabled={busy || !cap.data?.emailDelivery}
              secondary
              icon="mail"
            />
            <View style={{ height: 12 }} />
            <Button
              title="Back to sign in"
              onPress={() => router.replace("/login")}
              secondary
            />
          </>
        )}
        <SecurityNote>
          We never show verification tokens in the app or use them as login
          sessions.
        </SecurityNote>
      </Card>
    </AuthFrame>
  );
}
